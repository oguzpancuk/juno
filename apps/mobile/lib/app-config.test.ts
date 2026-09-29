import { readFileSync } from 'node:fs';
import { LANGUAGES } from '@juno/astro';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

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
  it('declares every language the app speaks, Turkish first', () => {
    // Apple's Sign in with Apple button titles itself in a language the
    // app bundle declares, not simply the phone's. With none declared a
    // prebuild makes the bundle English-only, and a Turkish phone shows
    // "Sign in with Apple" between two Turkish buttons. Declaring each
    // catalog's language is also what lets iOS offer the app's own
    // language in the system Settings, which `lib/language.ts` follows.
    const plist = app.expo.ios.infoPlist;
    expect(plist?.CFBundleDevelopmentRegion).toBe('tr');
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

  it('keeps the Turkish prompt the same as the plugin’s own', () => {
    // The plugin's sentence is the bundle's base one; the Turkish locale
    // must not say something else to a Turkish phone.
    const plugin = app.expo.plugins.find(
      (entry): entry is [string, unknown] =>
        Array.isArray(entry) && entry[0] === 'expo-location',
    );
    const options = z
      .object({ locationWhenInUsePermission: z.string() })
      .parse(plugin?.[1]);
    const tr = LocaleJson.parse(read(`../${app.expo.locales?.tr ?? ''}`));
    expect(tr.ios.NSLocationWhenInUseUsageDescription).toBe(
      options.locationWhenInUsePermission,
    );
  });
});
