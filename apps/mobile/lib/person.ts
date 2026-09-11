import { DiscoverRowSchema, type DiscoverRow } from './discover';
import { MatchProfileRowSchema } from './matches';
import { supabase } from './supabase';

/**
 * Anyone whose profile the viewer is allowed to open: someone in the deck,
 * or someone they matched with.
 *
 * Two views rather than a table, because those two are the only places RLS
 * lets a member see another person at all — `discover` applies radius,
 * gender, age and the block list; `match_profiles` applies membership. A
 * profile screen that read `profiles` directly would be a hole in both.
 *
 * The match is tried first: a person you have matched with has left your
 * deck, so `discover` no longer carries them.
 */
export type Person = DiscoverRow & {
  /** Set when this person is a match, so the screen can link to the thread. */
  readonly matchId: string | null;
};

export type PersonState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly person: Person }
  | { readonly status: 'gone' }
  | { readonly status: 'error' };

export async function fetchPerson(id: string): Promise<PersonState> {
  const match = await supabase
    .from('match_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  // A failed `match_profiles` query is not the end of the lookup: most
  // profiles opened here are deck members, whose row is in `discover` a
  // query away. Reporting an error for them would be wrong.
  if (match.data) {
    const parsed = MatchProfileRowSchema.safeParse(match.data);
    if (!parsed.success) return { status: 'error' };
    const { match_id, ...rest } = parsed.data;
    // `match_profiles` has no distance: a match keeps its thread wherever
    // either of them moves to.
    return {
      status: 'ready',
      person: { ...rest, distance_km: 0, matchId: match_id },
    };
  }

  const row = await supabase
    .from('discover')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (row.error) return { status: 'error' };
  // Neither view has them: blocked, deleted, or out of the deck's reach.
  // Unless the first query failed too, in which case nothing was learned.
  if (!row.data) return { status: match.error ? 'error' : 'gone' };
  const parsed = DiscoverRowSchema.safeParse(row.data);
  if (!parsed.success) return { status: 'error' };
  return { status: 'ready', person: { ...parsed.data, matchId: null } };
}
