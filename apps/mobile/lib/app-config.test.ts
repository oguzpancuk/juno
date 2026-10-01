import { readFileSync } from 'node:fs';
import { LANGUAGES } from '@juno/astro';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FALLBACK_LANGUAGE } from './language-choice';

const AppJson = z.object({
  expo: z.object({
    ios: z.object({
      infoPlist: z
        .object({
          CFBundleDevelopmentRegion: z.string().optional(),
          CFBundleLocalizations: z.array(z.string()).optional(),
        })
        .optional(),
    }),
    locales: z.record(z.string(), z.string()).optional(),
    web: z.object({ lang: z.string() }).partial().optional(),
    plugins: z.array(z.union([z.string(), z.tuple([z.string(), z.unknown()])])),
  }),
});

const LocaleJson = z.object({
  ios: z.object({
    CFBundleDisplayName: z.string().min(1),
    NSLocationWhenInUseUsageDescription: z.string().min(20),
  }),
});

const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const app = AppJson.parse(read('../app.json'));

describe('the iOS bundle', () => {
  it('declares every language the app speaks, the fallback as the base', () => {
    // Apple's Sign in with Apple button titles itself in a language the
    // app bundle declares, not simply the phone's. With none declared a
    // prebuild makes the bundle English-only, and a Turkish phone shows
    // "Sign in with Apple" between two Turkish buttons. Declaring each
    // catalog's language is also what lets iOS offer the app's own
    // language in the system Settings, which `lib/language.ts` follows.
    // A phone in none of them gets the development region's, so that is
    // the app's own fallback: an English prompt and button beside English
    // screens.
    const plist = app.expo.ios.infoPlist;
    expect(plist?.CFBundleDevelopmentRegion).toBe(FALLBACK_LANGUAGE);
    expect(plist?.CFBundleLocalizations).toEqual([...LANGUAGES]);
  });

  it('asks for the location in every language it declares', () => {
    // The permission prompt is drawn by iOS from the bundle, before any
    // JavaScript runs, so the catalog cannot reach it: each language has
    // its own sentence in `locales/`, which a prebuild writes into that
    // language's InfoPlist.strings.
    expect(Object.keys(app.expo.locales ?? {})).toEqual([...LANGUAGES]);
    for (const [language, path] of Object.entries(app.expo.locales ?? {})) {
      const locale = LocaleJson.parse(read(`../${path}`));
      expect(locale.ios.CFBundleDisplayName, language).toBe('Juno');
    }
  });

  it('writes the base prompt in the fallback language', () => {
    // The plugin's sentence goes into the base Info.plist, which iOS reads
    // as the development region's, the fallback's: a phone in a language
    // the app does not have must not be asked in another one.
    const plugin = app.expo.plugins.find(
      (entry): entry is [string, unknown] =>
        Array.isArray(entry) && entry[0] === 'expo-location',
    );
    const options = z
      .object({ locationWhenInUsePermission: z.string() })
      .parse(plugin?.[1]);
    const fallback = LocaleJson.parse(
      read(`../${app.expo.locales?.[FALLBACK_LANGUAGE] ?? ''}`),
    );
    expect(options.locationWhenInUsePermission).toBe(
      fallback.ios.NSLocationWhenInUseUsageDescription,
    );
  });
});

describe('the web page', () => {
  it('starts in the fallback language, before any script runs', () => {
    // `<html lang>` of the static page: what a browser or a screen reader
    // assumes until `lib/language.ts` sets the member's own at import.
    expect(app.expo.web?.lang).toBe(FALLBACK_LANGUAGE);
  });
});
