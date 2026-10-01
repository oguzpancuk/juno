/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { LANGUAGES, SOURCE_LANGUAGE } from '@juno/astro';
import { CATALOGS, LOCALE_TAGS } from './i18n';
import {
  LEGAL_SECTIONS,
  LEGAL_UPDATED,
  LEGAL_UPDATED_IN,
  LEGAL_VERSION,
  legalSections,
} from './legal';
import { t } from './strings';

describe('the privacy notice', () => {
  it('names the onboarding link by its current label', () => {
    // The notice types the label out rather than importing it: a change
    // to UI copy must not quietly change the notice's text under a
    // version that says otherwise. This is what catches the rename, so
    // the notice is reworded, and its version moved, in the same change.
    const text = legalSections.flatMap((section) => section.body).join('\n');
    expect(text).toContain(`“${t.onboarding.switchAccount}”`);
  });

  it('keeps both the premium lines and the sign-in provider lines', () => {
    // Two PRs wrote into the same lists and were merged by hand (#14, then
    // #13); a resolution that kept one side only would pass everything
    // else.
    const text = legalSections.flatMap((section) => section.body).join('\n');
    expect(text).toContain('• Beğendiğin kişi.');
    expect(text).toContain('• Üyelik bilgin:');
    expect(text).toContain('• Giriş sağlayıcıları.');
    expect(text).toContain('• Apple ya da Google ile girersen:');
  });

  it('has decided, for every dependency the app ships, whether the notice names it', () => {
    // A processor is in the notice in the change that puts it in the
    // path (lib/legal.ts). The dependency list is where that change
    // shows, so every runtime dependency is listed here with the name the
    // notice must carry, or null and the reason it carries none. A new
    // dependency fails until someone has made that decision.
    const pkg = z
      .object({ dependencies: z.record(z.string()) })
      .parse(
        JSON.parse(
          readFileSync(
            resolve(import.meta.dirname, '..', 'package.json'),
            'utf8',
          ),
        ) as unknown,
      );
    const text = legalSections.flatMap((section) => section.body).join('\n');
    const NOT_A_RECIPIENT = null;
    const decided: Record<string, string | null> = {
      '@supabase/supabase-js': 'Supabase',
      '@sentry/react-native': 'Sentry',
      '@react-native-google-signin/google-signin': 'Google',
      'expo-apple-authentication': 'Apple',
      // Font files bundled with the app; nothing is fetched.
      '@expo-google-fonts/outfit': NOT_A_RECIPIENT,
      // This repo's own engine and city list, on the device.
      '@juno/astro': NOT_A_RECIPIENT,
      '@juno/geo': NOT_A_RECIPIENT,
      // On-device storage, UI, navigation, platform glue and validation:
      // none of these sends anything anywhere.
      '@expo/metro-runtime': NOT_A_RECIPIENT,
      '@react-native-async-storage/async-storage': NOT_A_RECIPIENT,
      expo: NOT_A_RECIPIENT,
      'expo-blur': NOT_A_RECIPIENT,
      'expo-constants': NOT_A_RECIPIENT,
      'expo-dev-client': NOT_A_RECIPIENT,
      // The picker hands back the one image chosen; the upload is Supabase.
      'expo-image-picker': NOT_A_RECIPIENT,
      'expo-linear-gradient': NOT_A_RECIPIENT,
      'expo-linking': NOT_A_RECIPIENT,
      // The device's own position; the app neither geocodes nor sends it
      // anywhere but Supabase.
      'expo-location': NOT_A_RECIPIENT,
      'expo-router': NOT_A_RECIPIENT,
      'expo-secure-store': NOT_A_RECIPIENT,
      'expo-splash-screen': NOT_A_RECIPIENT,
      'expo-status-bar': NOT_A_RECIPIENT,
      react: NOT_A_RECIPIENT,
      'react-dom': NOT_A_RECIPIENT,
      'react-native': NOT_A_RECIPIENT,
      'react-native-safe-area-context': NOT_A_RECIPIENT,
      'react-native-screens': NOT_A_RECIPIENT,
      'react-native-svg': NOT_A_RECIPIENT,
      'react-native-url-polyfill': NOT_A_RECIPIENT,
      'react-native-web': NOT_A_RECIPIENT,
      zod: NOT_A_RECIPIENT,
    };
    expect(
      Object.keys(pkg.dependencies).filter((name) => !(name in decided)),
      'dependencies with no decision about the notice',
    ).toEqual([]);
    for (const [dependency, name] of Object.entries(decided))
      if (name !== null && dependency in pkg.dependencies)
        expect(text, dependency).toContain(name);
  });

  it('shows the date its version names', () => {
    // Both are moved by hand in every change to the text.
    const rendered = new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${LEGAL_VERSION}T00:00:00Z`));
    expect(LEGAL_UPDATED).toBe(rendered);
  });
});

describe('the privacy notice in translation', () => {
  const translations = LANGUAGES.filter((l) => l !== SOURCE_LANGUAGE);

  it.each(LANGUAGES)('%s writes the date its version names', (language) => {
    const rendered = new Intl.DateTimeFormat(LOCALE_TAGS[language], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${LEGAL_VERSION}T00:00:00Z`));
    expect(LEGAL_UPDATED_IN[language]).toBe(rendered);
  });

  it.each(translations)(
    '%s has every section and every line of the Turkish text',
    (language) => {
      // Line for line: a translation that merged two bullets or dropped a
      // sentence would still read well, and say less than what binds.
      const shape = (sections: typeof legalSections) =>
        sections.map((section) =>
          section.body.map((line) => line.startsWith('• ')),
        );
      expect(shape(LEGAL_SECTIONS[language])).toEqual(shape(legalSections));
    },
  );

  it.each(translations)(
    '%s names every processor, contact and law the Turkish names',
    (language) => {
      const text = LEGAL_SECTIONS[language]
        .flatMap((section) => section.body)
        .join('\n');
      for (const name of [
        'Oğuz Pançuk',
        'destek@juno-dating.com',
        'juno-dating.com',
        'Supabase',
        'Resend',
        'Cloudflare',
        'Namecheap',
        'Sentry',
        'Apple',
        'Google',
        'GeoNames',
        'astronomy-engine',
        '6698',
        'KVKK',
        '18',
      ])
        expect(text, name).toContain(name);
    },
  );

  it.each(translations)(
    '%s names the onboarding link by its label in that language',
    (language) => {
      const text = LEGAL_SECTIONS[language]
        .flatMap((section) => section.body)
        .join('\n');
      expect(text).toContain(
        `“${CATALOGS[language].onboarding.switchAccount}”`,
      );
    },
  );
});
