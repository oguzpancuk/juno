import type { PostgrestError } from '@supabase/supabase-js';
import type { BigThree, PublicChart } from '@juno/astro';
import type { Gender } from './profile';

/**
 * Premium membership's own arithmetic: the quota numbers, the windows
 * they are counted over, the order the deck and the "seni beğenenler"
 * list come in, and which refusal a message names.
 *
 * Pure on purpose, and separate from `premium.ts` for the reason
 * `unread-count.ts` is separate from `unread.ts`: this file imports no
 * React Native and no Supabase client, so Vitest can drive all of it.
 * Every type it names is imported as a type and erased.
 *
 * There is no payment step (owner, 2026-09-21): "premium ol" writes the
 * flag on the member's own row and the membership is live in that round
 * trip. What the flag buys is enforced by the database —
 * `private.likes_enforce_quota` refuses the 21st like of a free day and
 * every super like a free member tries — so nothing here is a rule, only
 * what the screen says about one.
 *
 * The numbers below are the migration's numbers
 * (20260921000002_premium.sql). Both sides are driven by tests; change
 * one and the other has to agree.
 */
export const FREE_DAILY_LIKES = 20;
export const SUPER_LIKES_PER_WEEK = 5;
/** The rolling windows the quotas count over, in hours. */
export const LIKE_WINDOW_HOURS = 24;
export const SUPER_WINDOW_HOURS = 7 * 24;

/**
 * How the deck is ordered; the choice between them is premium's. It
 * lives here rather than beside the other profile enums because
 * `profiles.sort_by` is this feature's column.
 */
export const SORT_ORDERS = ['distance', 'compatibility'] as const;
export type SortBy = (typeof SORT_ORDERS)[number];

/** The start of a rolling window, as PostgREST wants to be asked. */
export function windowStart(hours: number, now: Date = new Date()): string {
  return new Date(now.getTime() - hours * 3600_000).toISOString();
}

/** What is left of a quota; never negative, whatever the server counted. */
export function left(spent: number, limit: number): number {
  return Math.max(0, limit - spent);
}

/**
 * Why the database refused a like. Every quota raises `check_violation`,
 * so the message is the discriminator — the same shape as the existing
 * `likes_to_id_fkey` reading in `lib/discover.ts`, and pinned by
 * `supabase/tests/premium.test.ts` on the server side.
 */
export type QuotaRefusal = 'daily' | 'super-spent' | 'super-premium';

export function quotaRefusal(
  error: Pick<PostgrestError, 'code' | 'message'> | null,
): QuotaRefusal | null {
  if (!error || error.code !== '23514') return null;
  if (error.message.includes('daily like quota spent')) return 'daily';
  if (error.message.includes('super like quota spent')) return 'super-spent';
  if (error.message.includes('super like needs premium')) {
    return 'super-premium';
  }
  return null;
}

/** How many likes and super likes this member may still spend. */
export interface Allowance {
  /** null for a premium member: there is no cap to count against. */
  readonly likesLeft: number | null;
  /** 0 for a free member: super likes are the membership's. */
  readonly superLeft: number;
}

export const NO_ALLOWANCE: Allowance = { likesLeft: null, superLeft: 0 };

/**
 * The deck's order. Compatibility is the premium choice and was what
 * everyone got until this release; distance is what a free deck is
 * ordered by now, nearest first. Each falls back to the other, so the
 * order is total and two runs over the same deck agree.
 */
export function orderCandidates<
  T extends {
    readonly match: { readonly score: number };
    readonly row: { readonly distance_km: number };
  },
>(candidates: readonly T[], sortBy: SortBy): T[] {
  return [...candidates].sort((a, b) =>
    sortBy === 'compatibility'
      ? b.match.score - a.match.score || a.row.distance_km - b.row.distance_km
      : a.row.distance_km - b.row.distance_km || b.match.score - a.match.score,
  );
}

/**
 * The columns a `liked_me` row carries. The Zod schema that parses one
 * lives in `premium.ts`, at the boundary; this is the shape the pure
 * reading below needs, so that reading can be driven without a client.
 */
export interface LikedMeFields {
  readonly id: string | null;
  readonly display_name: string | null;
  readonly age: number | null;
  readonly gender: Gender | null;
  readonly big_three: BigThree | null;
  readonly chart: PublicChart | null;
  readonly bio: string | null;
  readonly photos: readonly string[] | null;
  readonly is_super: boolean;
  readonly liked_at: string;
}

/** One person who liked you, as a premium member sees them. */
export interface Admirer {
  readonly id: string;
  readonly display_name: string;
  readonly age: number;
  readonly gender: Gender;
  readonly big_three: BigThree;
  readonly chart: PublicChart;
  readonly bio: string | null;
  readonly photos: readonly string[];
  readonly is_super: boolean;
  readonly liked_at: string;
}

/**
 * The person behind a row, or null when the view withheld them. A row
 * missing one of its columns for any other reason is withheld too: a
 * locked card is the honest way to draw what cannot be read.
 */
export function admirerOf(row: LikedMeFields): Admirer | null {
  if (
    row.id === null ||
    row.display_name === null ||
    row.age === null ||
    row.gender === null ||
    row.big_three === null ||
    row.chart === null ||
    row.photos === null
  ) {
    return null;
  }
  return {
    id: row.id,
    display_name: row.display_name,
    age: row.age,
    gender: row.gender,
    big_three: row.big_three,
    chart: row.chart,
    bio: row.bio,
    photos: row.photos,
    is_super: row.is_super,
    liked_at: row.liked_at,
  };
}

/**
 * Calendar days between a like and now, on the device's own clock. The
 * list says "Bugün", "Dün" or "N gün önce": it is a list of people, not a
 * feed, and an hour count would invite refreshing it.
 *
 * Calendar days, not 24-hour buckets, because those are calendar words: a
 * like at 23:30 read at 08:00 is "Dün" to the person reading it, and
 * dividing the gap by a day would call it "Bugün". Midnight to midnight
 * and rounded, so a daylight-saving jump of an hour either way does not
 * move a day.
 */
export function daysSince(likedAt: string, now: Date = new Date()): number {
  const then = new Date(likedAt);
  if (Number.isNaN(then.getTime())) return 0;
  const midnight = (day: Date) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return Math.max(0, Math.round((midnight(now) - midnight(then)) / 86_400_000));
}

/** Super likes first, then newest first. Pure, so the order is tested. */
export function orderAdmirers<
  T extends { readonly is_super: boolean; readonly liked_at: string },
>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.is_super) - Number(a.is_super) ||
      b.liked_at.localeCompare(a.liked_at),
  );
}
