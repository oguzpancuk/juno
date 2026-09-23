/**
 * The four optional facts a profile may carry besides its photos, its bio
 * and its chart: height, interest tags, university and occupation (owner,
 * 2026-09-21: "boy, ilgi alanları (çoktan seçmeli), okuduğu üniversite,
 * mesleği").
 *
 * Pure: the rules live here so the edit screen, the row boundary and the
 * database's own CHECK constraints cannot drift apart, and so the whole
 * set is testable without a stack. Every limit below has a twin in
 * `supabase/migrations/20260921000001_profile_details.sql`; change one
 * and the other has to agree.
 */
import { searchKey } from '@juno/geo';
import { z } from 'zod';

/**
 * The interest tags, as keys. The list is fixed and lives in the repo —
 * free text would be a second unmoderated field on a dating profile, and
 * a tag nobody else can pick matches nobody.
 *
 * The key is what the database stores and checks; the Turkish word is in
 * `strings.ts` with the rest of the UI, one per key. Order here is the
 * order the chips are drawn in, loosely by theme.
 *
 * Not to be confused with `INTERESTS` in `profile.ts`, which is the
 * `interested_in` preference — who a person wants to meet.
 */
export const INTEREST_TAGS = [
  'music',
  'live_music',
  'dancing',
  'cinema',
  'series',
  'books',
  'poetry',
  'art',
  'photography',
  'theatre',
  'travel',
  'camping',
  'hiking',
  'sea',
  'skiing',
  'cycling',
  'running',
  'gym',
  'yoga',
  'pilates',
  'football',
  'basketball',
  'cooking',
  'coffee',
  'wine',
  'brunch',
  'street_food',
  'cats',
  'dogs',
  'plants',
  'board_games',
  'video_games',
  'technology',
  'astrology',
  'meditation',
  'volunteering',
] as const;

export type InterestTag = (typeof INTEREST_TAGS)[number];

/**
 * How many a person may pick. A profile that claims everything says
 * nothing, and the chips have to fit under the photo.
 */
export const MAX_INTERESTS = 8;

/** The picker's ends. Outside them the number is a typo, not a height. */
export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 230;

/** University and occupation: one short line each, not a paragraph. */
export const MAX_DETAIL_LENGTH = 60;

const TAGS: ReadonlySet<string> = new Set(INTEREST_TAGS);

export function isInterestTag(value: string): value is InterestTag {
  return TAGS.has(value);
}

/**
 * What a stored list is worth reading as: known tags only, each once, in
 * the canonical order, no more than the cap.
 *
 * Applied to what comes back from the database as well as to what goes
 * in. A row written by an older build, or by a list this build has since
 * shortened, must not put an unknown key on screen with no Turkish word
 * to draw for it.
 */
export function normalizeInterests(
  values: readonly string[],
): readonly InterestTag[] {
  const chosen = new Set(values.filter(isInterestTag));
  return INTEREST_TAGS.filter((tag) => chosen.has(tag)).slice(0, MAX_INTERESTS);
}

/**
 * Add or remove one tag. At the cap an addition is refused — the same
 * list comes back — so the caller can tell nothing happened and say why
 * rather than silently dropping someone else's pick.
 */
export function toggleInterest(
  current: readonly InterestTag[],
  tag: InterestTag,
): readonly InterestTag[] {
  if (current.includes(tag)) {
    return current.filter((each) => each !== tag);
  }
  if (current.length >= MAX_INTERESTS) return current;
  return normalizeInterests([...current, tag]);
}

/**
 * The tags a query matches, in the canonical order; an empty query
 * matches all of them, which is what the picker opens on.
 *
 * Matched on the Turkish word rather than the key: the key is English and
 * never reaches the screen, so `cats` must be found by "kedi". The word
 * is passed in because it lives in `strings.ts` with the rest of the UI,
 * which this module — pure, and shared with the row boundary — does not
 * import.
 *
 * Folded with the city search's own `searchKey`, so "muzik" finds "Müzik"
 * and "BİSİKLET" finds "Bisiklet". Turkish needs that in both directions
 * and `toLowerCase` alone does not give it: it maps "I" to "i", never to
 * "ı". Substring rather than prefix, because "müzik" should also reach
 * "Canlı müzik".
 */
export function searchInterests(
  query: string,
  name: (tag: InterestTag) => string,
): readonly InterestTag[] {
  const key = searchKey(query);
  if (key.length === 0) return INTEREST_TAGS;
  return INTEREST_TAGS.filter((tag) => searchKey(name(tag)).includes(key));
}

/**
 * One line of free text as it is stored: trimmed, inner runs of
 * whitespace collapsed, and null when nothing is left. Null rather than
 * an empty string because the column is nullable and "" would be a
 * second way to say "not answered" that every reader would have to know
 * about.
 *
 * Returns `undefined` for text that is too long, which is a draft the
 * screen must not save — the input caps the length, so this is the guard
 * against everything that did not come from it.
 */
export function cleanDetail(text: string): string | null | undefined {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length === 0) return null;
  if (clean.length > MAX_DETAIL_LENGTH) return undefined;
  return clean;
}

/** A height the picker could have produced, or null for "not answered". */
export function isHeight(value: number | null): boolean {
  if (value === null) return true;
  return (
    Number.isInteger(value) && value >= MIN_HEIGHT_CM && value <= MAX_HEIGHT_CM
  );
}

/** The stop a stored height sits on, and the height a stop means. */
export function heightStop(cm: number): number {
  return Math.min(Math.max(cm, MIN_HEIGHT_CM), MAX_HEIGHT_CM) - MIN_HEIGHT_CM;
}

export function stopHeight(stop: number): number {
  return Math.min(Math.max(stop + MIN_HEIGHT_CM, MIN_HEIGHT_CM), MAX_HEIGHT_CM);
}

export const HEIGHT_STOPS = MAX_HEIGHT_CM - MIN_HEIGHT_CM + 1;

/**
 * The four columns as every row boundary reads them: the own profile, a
 * discover row and a match row all carry the same four, so they are
 * spread into those three schemas rather than written out three times.
 *
 * Tolerant on the way in. The constraints make a bad value impossible
 * today, but a list this build has since shortened is not: an unknown tag
 * has no Turkish word to draw, and dropping the row over it would cost
 * the whole card.
 */
export const ProfileDetailColumns = {
  height_cm: z
    .number()
    .nullable()
    .transform((cm) => (cm !== null && isHeight(cm) ? cm : null)),
  interests: z.array(z.string()).transform(normalizeInterests),
  university: z.string().nullable(),
  occupation: z.string().nullable(),
};

/** The same four as a `select` list, for the one query that names columns. */
export const PROFILE_DETAIL_COLUMNS =
  'height_cm, interests, university, occupation';

/** What a profile carries besides its photos, its bio and its chart. */
export interface ProfileDetails {
  readonly height_cm: number | null;
  readonly interests: readonly InterestTag[];
  readonly university: string | null;
  readonly occupation: string | null;
}
