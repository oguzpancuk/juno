import { SOURCE_LANGUAGE, type Language } from '@juno/astro';
import { CATALOGS, type Strings } from './i18n';

/**
 * The UI strings in the language the app is showing.
 *
 * A live binding: `t` is reassigned by `setStringsLanguage` when the
 * language changes, and every `import { t }` sees the new catalog on its
 * next read. What makes the screens read again is the root layout, which
 * remounts the navigator under a key of the language (`app/_layout.tsx`),
 * so nothing drawn before the switch survives it with the old words.
 * Turkish until then, the source language; `lib/language.ts` sets the
 * device's (or the English fallback) at import, before the first frame.
 */
export let t: Strings = CATALOGS[SOURCE_LANGUAGE];

/** Point `t` at `language`'s catalog. Called only by `lib/language.ts`. */
export function setStringsLanguage(language: Language): void {
  t = CATALOGS[language];
}
