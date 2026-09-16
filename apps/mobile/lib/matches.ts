import {
  BigThreeSchema,
  PublicChartSchema,
  parseStarterKey,
} from '@juno/astro';
import { useEffect } from 'react';
import { z } from 'zod';
import { GENDERS } from './profile';
import { parseRows, warnDropped } from './rows';
import { READ_TIMEOUT_MS, supabase } from './supabase';

/** A row of the `match_profiles` view: my counterpart in one match. */
export const MatchProfileRowSchema = z.object({
  match_id: z.string().uuid(),
  starter_key: z
    .string()
    .refine((k) => parseStarterKey(k) !== null, 'malformed starter key'),
  matched_at: z.string(),
  id: z.string().uuid(),
  display_name: z.string(),
  age: z.number().int(),
  gender: z.enum(GENDERS),
  big_three: BigThreeSchema,
  chart: PublicChartSchema,
  // Conversation-list columns: null until the thread has a message.
  last_body: z.string().nullable(),
  last_at: z.string().nullable(),
  last_sender_id: z.string().uuid().nullable(),
  unread_count: z.number().int(),
  bio: z.string().nullable(),
  photos: z.array(z.string()),
});

export type MatchProfileRow = z.infer<typeof MatchProfileRowSchema>;

export async function fetchMatches(): Promise<MatchProfileRow[] | null> {
  const { data, error } = await supabase
    .from('match_profiles')
    .select('*')
    .order('matched_at', { ascending: false });
  if (error) return null;
  const rows = z.array(z.unknown()).safeParse(data);
  if (!rows.success) return null;
  // One unreadable row costs that conversation, not the whole list — but
  // it is reported, because every row failing at once must not read as
  // "you have no matches".
  return parseRows(
    MatchProfileRowSchema,
    rows.data,
    warnDropped('match_profiles'),
  );
}

export async function fetchMatch(
  matchId: string,
): Promise<MatchProfileRow | null> {
  const { data, error } = await supabase
    .from('match_profiles')
    .select('*')
    .eq('match_id', matchId)
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
    .maybeSingle();
  if (error || !data) return null;
  const parsed = MatchProfileRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

const MatchInsertSchema = z.object({ id: z.string().uuid() });

const announced = new Set<string>();

/**
 * True the first time a match id is seen this app run. The liker hears
 * of a match twice — `swipe()` returns it and the `matches` INSERT also
 * reaches the Realtime listener — and a late socket would otherwise
 * push "Eşleştiniz!" a second time over wherever the person has gone
 * (review, 2026-09-16). Both callers ask here before navigating.
 */
export function firstSightOf(matchId: string): boolean {
  if (announced.has(matchId)) return false;
  announced.add(matchId);
  return true;
}

/**
 * Fire `onMatch(matchId)` when a `matches` row appears for me. Realtime
 * postgres_changes respects RLS, so only my matches arrive.
 */
export function useMatchListener(
  userId: string | null,
  onMatch: (matchId: string) => void,
): void {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`matches:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          const row = MatchInsertSchema.safeParse(payload.new);
          if (row.success) onMatch(row.data.id);
        },
      )
      .subscribe((status, err) => {
        // Realtime is best-effort for the liked side; the liker also checks
        // match_profiles right after a like. Log so a dead socket is visible.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`matches channel ${status}`, err?.message);
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, onMatch]);
}
