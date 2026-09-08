import {
  BigThreeSchema,
  PublicChartSchema,
  isLesserId,
  parseStarterKey,
  starterSentenceTr,
} from '@stardate/astro';
import { useEffect } from 'react';
import { z } from 'zod';
import { GENDERS } from './profile';
import { supabase } from './supabase';

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
});

export type MatchProfileRow = z.infer<typeof MatchProfileRowSchema>;

/** The starter text for a match, from my side (a < b by uuid). */
export function starterFor(row: MatchProfileRow, myId: string): string | null {
  const key = parseStarterKey(row.starter_key);
  if (!key) return null;
  return starterSentenceTr(key, isLesserId(myId, row.id));
}

export async function fetchMatches(): Promise<MatchProfileRow[] | null> {
  const { data, error } = await supabase
    .from('match_profiles')
    .select('*')
    .order('matched_at', { ascending: false });
  if (error) return null;
  const parsed = z.array(MatchProfileRowSchema).safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function fetchMatch(
  matchId: string,
): Promise<MatchProfileRow | null> {
  const { data, error } = await supabase
    .from('match_profiles')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = MatchProfileRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

const MatchInsertSchema = z.object({ id: z.string().uuid() });

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
