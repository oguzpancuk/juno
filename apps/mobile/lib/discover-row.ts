/**
 * The shape of a `discover` row, and what the deck makes of one.
 *
 * Its own module because `discover.ts` reaches the network, and the
 * network here means `./supabase`, which means React Native: a test that
 * imports it cannot even be parsed by Vitest. Nothing below touches a
 * device or a server, so the rule the rows are read by is testable on
 * its own.
 */
import {
  BigThreeSchema,
  compatibility,
  describeAspectTr,
  PublicChartSchema,
  type Compatibility,
  type PublicChart,
} from '@juno/astro';
import { z } from 'zod';
import { ProfileDetailColumns } from './profile-details';
import { GENDERS } from './profile-enums';

/** The two ways somebody can already have chosen you. */
export const LIKES_ME = ['like', 'super'] as const;
export type LikesMe = (typeof LIKES_ME)[number];

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
  ...ProfileDetailColumns,
  // Whether this person has already chosen you, for the badge over the
  // name. Null for a free member — the view withholds it, because who
  // has liked you is what the membership sells.
  //
  // `.catch(null)` rather than a bare enum: a value this build does not
  // know is a card without a badge, not a card the deck drops. The rows
  // are parsed one by one (`parseRows`), so a strict enum here would
  // take the whole person off the screen over a decoration.
  likes_me: z.enum(LIKES_ME).nullable().catch(null),
});

export type DiscoverRow = z.infer<typeof DiscoverRowSchema>;

export interface Candidate {
  readonly row: DiscoverRow;
  readonly match: Compatibility;
  /** Turkish one-liner from the caller's point of view, or null. */
  readonly why: string | null;
}

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
