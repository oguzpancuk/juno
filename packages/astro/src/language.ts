/**
 * The language the engine's texts come back in.
 *
 * Everything the engine computes — positions, houses, aspects, scores,
 * bands — is the same in every language; only the words it returns for
 * them change. So the one piece of state here decides which content
 * bundle (`content/<language>/`) and which grammar (`words.ts`) a text
 * is read from, and nothing else. It defaults to Turkish, the source
 * language every other one is translated from, and the app sets it once
 * at start and again when the member picks another language.
 *
 * A new language is one entry here, one directory under `content/`, one
 * `Words` in `words.ts`; the compiler and `content.test.ts` point at
 * whatever is still missing.
 */
export const LANGUAGES = ['tr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Turkish: the source every translation is made from. */
export const SOURCE_LANGUAGE: Language = 'tr';

let current: Language = SOURCE_LANGUAGE;

export function setLanguage(language: Language): void {
  current = language;
}

export function currentLanguage(): Language {
  return current;
}

export function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value);
}
