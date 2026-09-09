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
  /** The key of the paths these sources were fetched for. */
  readonly key: string;
  readonly sources: readonly (PhotoSource | null)[];
}

/**
 * Sources for `paths`, always the same length and aligned by index.
 * Sources fetched for a different set are not shown at all: a screen that
 * has moved on to another person must show nothing rather than the
 * previous person's photo.
 */
export function sourcesFor(
  paths: readonly string[],
  fetched: FetchedSources,
): (PhotoSource | null)[] {
  if (fetched.key !== photoKey(paths)) return paths.map(() => null);
  return paths.map((_, index) => fetched.sources[index] ?? null);
}
