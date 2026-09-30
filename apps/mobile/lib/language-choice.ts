import { LANGUAGES, isLanguage, type Language } from '@juno/astro';
import { z } from 'zod';

/**
 * Which language the app shows, as a rule rather than a binding: what the
 * member chose, what the device says, and how the two meet. The binding
 * (storage, the device, the live catalog) is `lib/language.ts`.
 *
 * A member either picks a language in settings or leaves it to the device
 * ("device", the default). The device gives an ordered list of language
 * tags — the iPhone's language list, the browser's `navigator.languages`
 * — and the first one the app has a catalog for wins, so a phone set to
 * German then English reads English. When none matches, English
 * (`FALLBACK_LANGUAGE`).
 */
export type LanguagePreference = Language | 'device';

/**
 * What a device that names none of the app's languages gets: English, the
 * one most such members can read (owner, 2026-09-30). Turkish stays the
 * source the catalogs are written from; that is a different thing.
 */
export const FALLBACK_LANGUAGE: Language = 'en';

export const LanguagePreferenceSchema = z.enum(['device', ...LANGUAGES]);

/**
 * A stored preference, read from on-device storage, which is a boundary:
 * anything unreadable, or a language this build no longer ships, falls
 * back to following the device rather than failing the start-up.
 */
export function parsePreference(raw: string | null): LanguagePreference {
  const parsed = LanguagePreferenceSchema.safeParse(raw);
  return parsed.success ? parsed.data : 'device';
}

/** The language of a tag's first subtag: "en-GB" → "en", "tr_TR" → "tr". */
export function languageOfTag(tag: string): Language | null {
  const primary = tag.trim().split(/[-_]/u)[0]?.toLowerCase() ?? '';
  return isLanguage(primary) ? primary : null;
}

export function resolveLanguage(
  preference: LanguagePreference,
  deviceTags: readonly string[],
): Language {
  if (preference !== 'device') return preference;
  for (const tag of deviceTags) {
    const language = languageOfTag(tag);
    if (language !== null) return language;
  }
  return FALLBACK_LANGUAGE;
}
