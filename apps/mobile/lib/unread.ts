import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { z } from 'zod';
import { parseRows, warnDropped } from './rows';
import { READ_TIMEOUT_MS, supabase } from './supabase';
import { totalUnread } from './unread-count';

const UnreadRowSchema = z.object({ unread_count: z.number().int() });

/**
 * Every unread message across my conversations, from the same view and
 * the same column the conversation list draws its per-thread counts from,
 * so the tab and the list cannot disagree about what "unread" means — a
 * blocked person's thread, for one, is in neither. Null when the read
 * failed: a count nobody could read is not zero.
 */
export async function fetchUnreadTotal(): Promise<number | null> {
  const { data, error } = await supabase
    .from('match_profiles')
    .select('unread_count')
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
  if (error) return null;
  const rows = z.array(z.unknown()).safeParse(data);
  if (!rows.success) return null;
  return totalUnread(
    parseRows(UnreadRowSchema, rows.data, warnDropped('unread')),
  );
}

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Tell the badge the count may have moved. For the changes this device
 * makes itself — a thread marked read, a block placed or lifted — so the
 * badge follows at once even when the Realtime socket is down. Changes
 * made elsewhere arrive through the subscription below.
 */
export function notifyUnreadChanged(): void {
  for (const listener of listeners) listener();
}

/**
 * A burst of events is one read: a thread opened with twelve unread
 * messages marks all twelve in one update, which Realtime delivers as
 * twelve events.
 */
const SETTLE_MS = 300;

/**
 * The unread total for the Eşleşmeler tab's badge (owner, 2026-09-15: a
 * message arriving should show on the tab). Read once on sign-in, and
 * again — settled — whenever a message is sent to me or a message sent to
 * me is marked read, whenever this device changes the count itself, and
 * whenever the app comes back to the foreground, which is how a count
 * missed while the socket slept is caught up.
 *
 * The subscription is filtered by `recipient_id`, not left open on the
 * table: Realtime evaluates a filter before its per-subscriber RLS check,
 * so an unfiltered badge cost one check per person online for every
 * message anyone sent (ADR-0010). The filter narrows; RLS still decides,
 * so naming someone else's id receives nothing.
 *
 * A failed read keeps the last count rather than dropping to zero. A
 * different account never sees the previous one's number: the count is
 * held with the user it was read for.
 */
export function useUnreadTotal(userId: string | null): number {
  const [held, setHeld] = useState<{ userId: string; total: number } | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Latest read wins: an older one resolving late must not overwrite a
    // newer count.
    let issued = 0;

    const read = () => {
      issued += 1;
      const mine = issued;
      void fetchUnreadTotal().then((total) => {
        if (cancelled || mine !== issued || total === null) return;
        setHeld({ userId, total });
      });
    };
    const soon = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        read();
      }, SETTLE_MS);
    };

    read();
    listeners.add(soon);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') soon();
    });
    const channel = supabase
      .channel(`unread:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        soon,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        soon,
      )
      .subscribe((status, err) => {
        // Joined — and joined again after every reconnect: read once, so
        // messages that arrived while the socket was away are counted
        // (review, 2026-09-15). A read that changes nothing ends there.
        if (status === 'SUBSCRIBED') soon();
        // Without the socket the badge still follows this device's own
        // reads and every return to the foreground; say so in the log.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`unread channel ${status}`, err?.message);
        }
      });

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      listeners.delete(soon);
      foreground.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return held !== null && held.userId === userId ? held.total : 0;
}
