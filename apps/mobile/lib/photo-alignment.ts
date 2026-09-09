/**
 * The rule that decides what a screen shows for a set of photo paths.
 *
 * Split out of `photos.ts` so it can be tested without React Native: this
 * is where two defects lived. First the sources were compacted, which
 * shifted one person's photo onto another's card; then a set was held
 * over while it was refetched, which showed the previous candidate's
 * photo under the new candidate's name. Both are alignment mistakes, so
 * the rule is one function with a test.
 */

/** What an `Image` needs to show one photo. */
export interface PhotoSource {
  readonly uri: string;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Storage paths cannot contain a null byte, so joining on one is safe. */
export const PATH_SEPARATOR = '\u0000';

/** Identifies a set of paths by contents, not by array identity. */
export const photoKey = (paths: readonly string[]): string =>
  paths.join(PATH_SEPARATOR);

export interface FetchedSources {
  /** The paths these sources were fetched for, in their own order. */
  readonly paths: readonly string[];
  readonly sources: readonly (PhotoSource | null)[];
}

/**
 * Sources for `paths`, always the same length and aligned by index.
 *
 * A source is matched by its own path, never by position: a path carries
 * the owner's id, so a set fetched for another person can never match and
 * the deck cannot show the previous candidate's face under the new
 * candidate's name. On a screen where the same person's list changes —
 * removing one photo of six — the five that stayed keep their sources
 * instead of the whole grid blanking for a round trip.
 */
export function sourcesFor(
  paths: readonly string[],
  fetched: FetchedSources,
): (PhotoSource | null)[] {
  return paths.map((path) => {
    const at = fetched.paths.indexOf(path);
    return at === -1 ? null : (fetched.sources[at] ?? null);
  });
}
