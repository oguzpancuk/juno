import {
  BigThreeSchema,
  PublicChartSchema,
  compatibility,
  describeAspectTr,
  isLesserId,
  starterKey,
  type Compatibility,
  type PublicChart,
} from '@stardate/astro';
import { z } from 'zod';
import { GENDERS } from './profile';
import { parseRows, warnDropped } from './rows';
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
 * Fetch candidates and score them on device against the caller's chart.
 * Sorted by score, then distance — the view itself orders by distance.
 */
export async function fetchCandidates(
  myChart: PublicChart,
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
  const candidates = parsed
    .map((row) => {
      const match = compatibility(myChart, row.chart);
      return {
        row,
        match,
        why: match.strongest ? describeAspectTr(match.strongest) : null,
      };
    })
    .sort(
      (a, b) =>
        b.match.score - a.match.score || a.row.distance_km - b.row.distance_km,
    );
  return { status: 'ready', candidates };
}

export type SwipeResult =
  | { readonly ok: true; readonly matchId: string | null }
  | { readonly ok: false; readonly reason: 'no-aspect' | 'gone' | 'db' };

/**
 * Record a like or pass. The starter key is oriented by uuid order (a < b),
 * the same orientation the other side will compute, so the trigger's
 * equality check passes.
 */
export async function swipe(
  me: { readonly id: string; readonly chart: PublicChart },
  them: { readonly id: string; readonly chart: PublicChart },
  kind: 'like' | 'pass',
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
    .insert({ from_id: me.id, to_id: them.id, kind, starter_key });
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
