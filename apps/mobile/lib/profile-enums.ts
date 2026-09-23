/**
 * The closed lists a profile is made of, on their own.
 *
 * `profile.ts` re-exports all of them, and nothing here is new — they
 * moved out of it because it reaches the network, and the network means
 * `./supabase`, which means React Native. A module that only needs to
 * say "gender is one of these three" should not drag a device runtime in
 * with it, and a test of such a module could not be parsed at all.
 */

/** The four elements a Sun sign can have, as the filter offers them. */
export const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
export type SunElement = (typeof ELEMENTS)[number];

export const GENDERS = ['woman', 'man', 'unspecified'] as const;
export const INTERESTS = ['women', 'men', 'everyone'] as const;
export type Gender = (typeof GENDERS)[number];
export type Interest = (typeof INTERESTS)[number];
