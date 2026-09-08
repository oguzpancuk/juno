import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { supabase } from './supabase';

/** A row of `messages`. Both sides of a match read the same rows. */
export const MessageRowSchema = z.object({
  id: z.string().uuid(),
  match_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  body: z.string(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type MessageRow = z.infer<typeof MessageRowSchema>;

/** Mirrors the CHECK on `messages.body`. */
export const MAX_MESSAGE_LENGTH = 2000;

export const isSendable = (body: string): boolean => {
  const trimmed = body.trim();
  return trimmed.length > 0 && body.length <= MAX_MESSAGE_LENGTH;
};

export async function fetchMessages(
  matchId: string,
): Promise<MessageRow[] | null> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) return null;
  const parsed = z.array(MessageRowSchema).safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Insert one message. `sender_id` is also enforced by RLS; sending it
 * explicitly keeps the row valid without a server default.
 */
export async function sendMessage(
  matchId: string,
  senderId: string,
  body: string,
): Promise<MessageRow | null> {
  if (!isSendable(body)) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, body: body.trim() })
    .select('*')
    .single();
  if (error) return null;
  const parsed = MessageRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Mark the counterpart's unread messages as read. The update policy only
 * matches rows this user received, so the filter is a narrowing, not the
 * guard.
 */
export async function markThreadRead(
  matchId: string,
  myId: string,
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .neq('sender_id', myId)
    .is('read_at', null);
}

const byTime = (a: MessageRow, b: MessageRow): number =>
  a.created_at === b.created_at
    ? a.id.localeCompare(b.id)
    : a.created_at.localeCompare(b.created_at);

/** Insert-or-replace by id: a row can arrive twice (insert reply + Realtime). */
function merge(list: readonly MessageRow[], row: MessageRow): MessageRow[] {
  const without = list.filter((m) => m.id !== row.id);
  return [...without, row].sort(byTime);
}

export interface Thread {
  readonly messages: MessageRow[] | null | 'loading';
  readonly send: (body: string) => Promise<boolean>;
}

/**
 * One match's thread: initial load plus live inserts. Read receipts are
 * NOT sent here: the subscription outlives the screen's visibility, and a
 * message must not count as read while the thread sits in the background.
 * The screen marks read while it is focused. Realtime postgres_changes
 * respects RLS, so only this match's rows reach a member.
 */
export function useThread(matchId: string | null, myId: string | null): Thread {
  const [messages, setMessages] = useState<MessageRow[] | null | 'loading'>(
    'loading',
  );

  useEffect(() => {
    if (!matchId || !myId) return;
    let cancelled = false;
    void fetchMessages(matchId).then((rows) => {
      if (!cancelled) setMessages(rows);
    });

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = MessageRowSchema.safeParse(payload.new);
          if (!row.success || cancelled) return;
          setMessages((prev) =>
            merge(prev === 'loading' || prev === null ? [] : prev, row.data),
          );
        },
      )
      .subscribe((status, err) => {
        // A dead socket degrades to "no live updates", never to a wrong
        // thread; make it visible instead of silent.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`messages channel ${status}`, err?.message);
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [matchId, myId]);

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      if (!matchId || !myId) return false;
      const row = await sendMessage(matchId, myId, body);
      if (!row) return false;
      setMessages((prev) =>
        merge(prev === 'loading' || prev === null ? [] : prev, row),
      );
      return true;
    },
    [matchId, myId],
  );

  return { messages, send };
}
