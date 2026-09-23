import {
  bandOf,
  BANDS,
  BigThreeSchema,
  compatibility,
  describeAspectTr,
  elementOf,
  isLesserId,
  PublicChartSchema,
  starterKey,
  type Band,
  type Compatibility,
  type PublicChart,
} from '@juno/astro';
import { z } from 'zod';
import { GENDERS } from './profile';
import { orderCandidates, quotaRefusal, type SortBy } from './premium';
import { parseRows, warnDropped } from './rows';
import type { SunElement } from './profile';
import { supabase } from './supabase';

/** A row of the `discover` view (public columns only), Zod at the boundary. */
export const DiscoverRowSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  age: z.number().int(),
  gender: z.enum(GENDERS),
  big_three: BigThreeSchema,
  chart: PublicChartSchema,
  distance_km: z.number().int().nonnegative(),
  bio: z.string().nullable(),
  photos: z.array(z.string()),
});

export type DiscoverRow = z.infer<typeof DiscoverRowSchema>;

export interface Candidate {
  readonly row: DiscoverRow;
  readonly match: Compatibility;
  /** Turkish one-liner from the caller's point of view, or null. */
  readonly why: string | null;
}

export type DiscoverState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly candidates: readonly Candidate[] }
  | { readonly status: 'error' };

/**
 * One row, scored against the reader's chart. The deck also builds a card
 * this way for somebody it did not fetch — a person tapped on "Seni
 * beğenenler" who is outside the reader's filters (owner, 2026-09-23:
 * "burada bir ayrim olmasin") — so the scoring lives here rather than
 * inline below, and both cards are made the same way.
 */
export function candidateOf(myChart: PublicChart, row: DiscoverRow): Candidate {
  const match = compatibility(myChart, row.chart);
  return {
    row,
    match,
    why: match.strongest ? describeAspectTr(match.strongest) : null,
  };
}

/**
 * Fetch candidates and score them on device against the caller's chart.
 *
 * The order is the member's: nearest first, or — the premium choice —
 * best match first (`orderCandidates`). Until 2026-09-21 every deck was
 * ordered by score, which left the membership nothing to offer.
 *
 * Two of the filters cannot run in `discover`: the band comes from a score
 * computed here from two charts, and the element from a chart the view
 * only carries as JSON. They are applied after scoring, over rows the
 * server has already filtered by radius, gender and age.
 */
export async function fetchCandidates(
  myChart: PublicChart,
  filters: DiscoverFilters = {
    minBand: 'quiet',
    sunElements: null,
    sortBy: 'distance',
  },
): Promise<DiscoverState> {
  const { data, error } = await supabase.from('discover').select('*');
  if (error) return { status: 'error' };
  const rows = z.array(z.unknown()).safeParse(data);
  if (!rows.success) return { status: 'error' };
  // Row by row, not the array in one go: the server checks the shape of a
  // chart, but a single row it somehow let through must cost that one
  // card, not the whole deck for everyone in radius.
  const parsed = parseRows(
    DiscoverRowSchema,
    rows.data,
    warnDropped('discover'),
  );
  const floor = BANDS.indexOf(filters.minBand);
  const wanted = filters.sunElements;
  const candidates = parsed
    .map((row) => candidateOf(myChart, row))
    .filter(({ row, match }) => {
      if (BANDS.indexOf(bandOf(match.score)) < floor) return false;
      // null means every element; the column forbids an empty list, which
      // would mean nobody.
      if (wanted === null || wanted.length === 0) return true;
      return wanted.includes(elementOf(row.big_three.sun));
    });
  return {
    status: 'ready',
    candidates: orderCandidates(candidates, filters.sortBy),
  };
}

export type SwipeResult =
  | { readonly ok: true; readonly matchId: string | null }
  | {
      readonly ok: false;
      readonly reason:
        | 'no-aspect'
        | 'gone'
        | 'db'
        // What the quotas refused: a free day's likes are spent, this
        // week's super likes are spent, or a super like was tried without
        // the membership. `private.likes_enforce_quota` decides; the app
        // only reads which.
        | 'daily'
        | 'super-spent'
        | 'super-premium';
    };

/**
 * Record a like or pass. The starter key is oriented by uuid order (a < b),
 * the same orientation the other side will compute, so the trigger's
 * equality check passes.
 *
 * A super like is a like with the star on it: same key, same match the
 * moment it is answered, and the person it is sent to sees the star on
 * their "seni beğenenler" list.
 */
export async function swipe(
  me: { readonly id: string; readonly chart: PublicChart },
  them: { readonly id: string; readonly chart: PublicChart },
  kind: 'like' | 'pass',
  isSuper = false,
): Promise<SwipeResult> {
  let starter_key: string | null = null;
  if (kind === 'like') {
    starter_key = isLesserId(me.id, them.id)
      ? starterKey(me.chart, them.chart)
      : starterKey(them.chart, me.chart);
    if (!starter_key) return { ok: false, reason: 'no-aspect' };
  }
  const { error } = await supabase
    .from('likes')
    // `created_at` is not sent: the trigger stamps it, because a client
    // that chose it could date its likes out of every quota window.
    .insert({
      from_id: me.id,
      to_id: them.id,
      kind,
      starter_key,
      is_super: isSuper && kind === 'like',
    });
  // Before the generic paths: a spent quota is a sentence the person can
  // act on, not "bir şeyler ters gitti".
  const refusal = quotaRefusal(error);
  if (refusal) return { ok: false, reason: refusal };
  // 23505: already swiped (lost response); treat as done.
  // 42501: they blocked us while the card was on screen. 23503 on the
  // to_id foreign key: they deleted their account. Either way this person
  // is no longer swipeable, so the deck drops the card instead of refusing
  // every tap on it. A 23503 on from_id is OUR profile going missing and
  // must fall through to the error path, and PostgREST redacts the column
  // from `details`, so the constraint name is the only discriminator —
  // `likes_to_id_fkey` is pinned by an RLS test.
  const missingCounterpart =
    error?.code === '23503' && /to_id/.test(error.message);
  if (error && (error.code === '42501' || missingCounterpart)) {
    return { ok: false, reason: 'gone' };
  }
  if (error && error.code !== '23505') return { ok: false, reason: 'db' };
  if (kind === 'pass') return { ok: true, matchId: null };
  // The liker learns about a closed match deterministically, without
  // depending on the Realtime socket being up at this instant.
  const { data } = await supabase
    .from('match_profiles')
    .select('match_id')
    .eq('id', them.id)
    .maybeSingle();
  const parsed = z.object({ match_id: z.string().uuid() }).safeParse(data);
  return { ok: true, matchId: parsed.success ? parsed.data.match_id : null };
}

export const RADIUS_OPTIONS = [5, 25, 50, 100, 500] as const;

export async function updateRadius(
  userId: string,
  radiusKm: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ radius_km: radiusKm })
    .eq('id', userId);
  return !error;
}

/**
 * Move the profile to a new point. The DB snaps it to a ~1 km grid, so
 * what lands in the row is a cell, never the exact device fix.
 */
/** A sensor read is an external boundary: NaN reaches PostGIS otherwise. */
const PointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export async function updateLocation(
  userId: string,
  candidate: { readonly latitude: number; readonly longitude: number },
): Promise<boolean> {
  const parsed = PointSchema.safeParse(candidate);
  if (!parsed.success) return false;
  const point = parsed.data;
  const { error } = await supabase
    .from('profiles')
    .update({
      location: `SRID=4326;POINT(${point.longitude} ${point.latitude})`,
    })
    .eq('id', userId);
  return !error;
}

/** What the discovery screen filters by, beyond what `discover` can do. */
export interface DiscoverFilters {
  readonly minBand: Band;
  /** null means every element. */
  readonly sunElements: readonly SunElement[] | null;
  /** Nearest first, or best match first — the premium choice. */
  readonly sortBy: SortBy;
}
