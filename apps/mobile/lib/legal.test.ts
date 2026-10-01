/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
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

  it('names every third party the app ships a client for', () => {
    // A processor is in the notice in the change that puts it in the
    // path (lib/legal.ts). The dependency list is where that change
    // shows, so the notice is checked against it.
    const pkg = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '..', 'package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };
    const text = legalSections.flatMap((section) => section.body).join('\n');
    const processors: Record<string, string> = {
      '@supabase/supabase-js': 'Supabase',
      '@sentry/react-native': 'Sentry',
    };
    for (const [dependency, name] of Object.entries(processors))
      if (dependency in pkg.dependencies)
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
