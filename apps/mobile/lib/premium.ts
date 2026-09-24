import { BigThreeSchema, PublicChartSchema } from '@juno/astro';
import { z } from 'zod';
import { GENDERS } from './profile';
import {
  FREE_DAILY_LIKES,
  LIKE_WINDOW_HOURS,
  SUPER_LIKES_PER_WEEK,
  SUPER_WINDOW_HOURS,
  left,
  orderAdmirers,
  windowStart,
  type Allowance,
  type SortBy,
} from './premium-rules';
import { normalizeInterests, ProfileDetailColumns } from './profile-details';
import { parseRows, warnDropped } from './rows';
import { READ_TIMEOUT_MS, supabase } from './supabase';

/**
 * Premium membership at the boundary: what it reads, what it writes, and
 * the schema every row is parsed with. Its arithmetic — the quota
 * numbers, the orders, which refusal a message names — is
 * `premium-rules.ts`, which this file re-exports so a screen has one
 * import.
 */
export * from './premium-rules';

/**
 * Count what the member has spent in each window. One head count over
 * their own likes, which RLS already lets them read — the alternative was
 * a view per counter.
 *
 * A count that cannot be read answers as if nothing were spent: the
 * database refuses the like anyway, and a deck that hides its own ♥
 * because a counter timed out is worse than one that tries and is told no.
 */
export async function fetchAllowance(
  userId: string,
  isPremium: boolean,
  now: Date = new Date(),
): Promise<Allowance> {
  if (!isPremium) {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('from_id', userId)
      .eq('kind', 'like')
      .gte('created_at', windowStart(LIKE_WINDOW_HOURS, now))
      .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
    return { likesLeft: left(count ?? 0, FREE_DAILY_LIKES), superLeft: 0 };
  }
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('from_id', userId)
    .eq('is_super', true)
    .gte('created_at', windowStart(SUPER_WINDOW_HOURS, now))
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
  return {
    likesLeft: null,
    superLeft: left(count ?? 0, SUPER_LIKES_PER_WEEK),
  };
}

/**
 * Become a premium member. One write, no receipt: the owner's decision of
 * 2026-09-21 is that buying is a tap until payments land. `premium_since`
 * is the server's, stamped by `private.profiles_stamp_premium`.
 */
export async function becomePremium(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_premium: true })
    .eq('id', userId)
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
  return !error;
}

/** How the deck is ordered. Only a premium member is offered the choice. */
export async function setSortBy(
  userId: string,
  sortBy: SortBy,
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ sort_by: sortBy })
    .eq('id', userId)
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
  return !error;
}

/**
 * A row of `liked_me`. Everything that identifies a person is null for a
 * free member — the view leaves it out of the answer rather than trusting
 * the client to hide it — so every column but the star and the day is
 * nullable here.
 */
export const LikedMeRowSchema = z.object({
  id: z.string().uuid().nullable(),
  display_name: z.string().nullable(),
  age: z.number().int().nullable(),
  gender: z.enum(GENDERS).nullable(),
  big_three: BigThreeSchema.nullable(),
  chart: PublicChartSchema.nullable(),
  bio: z.string().nullable(),
  photos: z.array(z.string()).nullable(),
  // The profile's own readings, so a list row and a deck row agree on
  // what a stored value is worth; `interests` is null only when withheld.
  height_cm: ProfileDetailColumns.height_cm,
  interests: z.array(z.string()).transform(normalizeInterests).nullable(),
  university: ProfileDetailColumns.university,
  occupation: ProfileDetailColumns.occupation,
  distance_km: z.number().int().nonnegative().nullable(),
  is_super: z.boolean(),
  liked_at: z.string(),
});

export type LikedMeRow = z.infer<typeof LikedMeRowSchema>;

/**
 * How many people are waiting for an answer. Free or premium, the count
 * is the same number — the rows a free member gets carry no person, but
 * there is one row each, which is what the chip on the deck shows.
 *
 * Answers 0 when it cannot be read: a chip that promises a number nobody
 * can open is worse than no chip.
 */
export async function fetchLikedMeCount(): Promise<number> {
  const { count, error } = await supabase
    .from('liked_me')
    .select('*', { count: 'exact', head: true })
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
  return error ? 0 : (count ?? 0);
}

export type LikedMeState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly rows: readonly LikedMeRow[] }
  | { readonly status: 'error' };

/**
 * Who has liked you, the stars first and then the newest — an order that
 * holds for a locked list too, which is why it is made on the star and
 * the day rather than on anything the view withholds.
 */
export async function fetchLikedMe(): Promise<LikedMeState> {
  const { data, error } = await supabase
    .from('liked_me')
    .select('*')
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
  if (error) return { status: 'error' };
  const rows = z.array(z.unknown()).safeParse(data);
  if (!rows.success) return { status: 'error' };
  // Row by row, like the deck: one unreadable row costs its own card, not
  // the whole list.
  const parsed = parseRows(
    LikedMeRowSchema,
    rows.data,
    warnDropped('liked_me'),
  );
  return { status: 'ready', rows: orderAdmirers(parsed) };
}
