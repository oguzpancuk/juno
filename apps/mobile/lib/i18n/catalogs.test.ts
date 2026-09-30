import { LANGUAGES, SOURCE_LANGUAGE } from '@juno/astro';
import { spanishGenderHits } from '@juno/astro/src/testing/spanish-gender';
import { describe, expect, it } from 'vitest';
import { LEGAL_SECTIONS } from '../legal';
import { CATALOGS, LANGUAGE_NAMES, LOCALE_TAGS, SHORT_DATE } from './index';

/**
 * What the compiler cannot see about a translation: a list one line short,
 * a function that takes the right parameters but ignores one, a string
 * left in Turkish. The type (`Strings`) already refuses a missing or an
 * extra key.
 */

/**
 * Distinct sample arguments for a catalog function, so each can be found
 * in the output. Every catalog function takes numbers and names, and a
 * number where it wanted a string still prints, so numbers throughout
 * would do — except that a name must not read as a count to a plural.
 */
function argsFor(fn: (...args: never[]) => unknown): (number | string)[] {
  return Array.from({ length: fn.length }, (_, i) => 7 + i);
}

/** Strings that are the same word in every language. */
const SAME_EVERYWHERE = new Set([
  'appName',
  'chart.retrograde',
  'common.backGlyph',
  'onboarding.providerNames.apple',
  'onboarding.providerNames.google',
  'verify.placeholder',
  'onboarding.datePlaceholders.year',
  'profile.interestNames.yoga',
  'profile.interestNames.pilates',
  'profile.interestNames.brunch',
  // Units and a brand line.
  'chart.orb',
  'profile.heightValue',
  'premium.kicker',
]);

type Leaf = { path: string; value: unknown };

function leaves(value: unknown, path = ''): Leaf[] {
  if (typeof value === 'string' || typeof value === 'function')
    return [{ path, value }];
  if (Array.isArray(value))
    return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value !== null && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) =>
      leaves(v, path === '' ? k : `${path}.${k}`),
    );
  return [{ path, value }];
}

/** A function's output for the sample arguments, a string's own text. */
function render(value: unknown): unknown {
  if (typeof value !== 'function') return value;
  const fn = value as (...args: unknown[]) => unknown;
  return fn(...argsFor(fn));
}

const source = CATALOGS[SOURCE_LANGUAGE];
const translations = LANGUAGES.filter((l) => l !== SOURCE_LANGUAGE);

describe('the string catalogs', () => {
  it.each(translations)('%s has every Turkish key, list and parameter', (l) => {
    const want = leaves(source).map(({ path, value }) => [
      path,
      typeof value,
      typeof value === 'function' ? value.length : null,
    ]);
    const got = leaves(CATALOGS[l]).map(({ path, value }) => [
      path,
      typeof value,
      typeof value === 'function' ? value.length : null,
    ]);
    expect(got).toEqual(want);
  });

  it.each(translations)('%s leaves nothing in Turkish', (l) => {
    const turkish = new Map(
      leaves(source).map(({ path, value }) => [path, value]),
    );
    const copied = leaves(CATALOGS[l])
      .filter(({ path }) => !SAME_EVERYWHERE.has(path.replace(/\[\d+\]$/, '')))
      .filter(({ path, value }) => {
        const twin = turkish.get(path);
        const mine = render(value);
        return (
          JSON.stringify(mine) === JSON.stringify(render(twin)) &&
          // A string of digits and punctuation is the same everywhere.
          /\p{L}{2}/u.test(JSON.stringify(mine))
        );
      })
      .map(({ path }) => path);
    expect(copied).toEqual([]);
  });

  it.each(LANGUAGES)('%s uses every argument it is given', (l) => {
    // A translation that drops `${name}` still type-checks; the sample
    // arguments are distinct, so each must show up in the output.
    const unused: string[] = [];
    for (const { path, value } of leaves(CATALOGS[l])) {
      if (typeof value !== 'function') continue;
      const fn = value as (...args: unknown[]) => unknown;
      const args = argsFor(fn);
      const text = JSON.stringify(fn(...args));
      for (const arg of args)
        if (!text.includes(String(arg))) unused.push(`${path}: ${String(arg)}`);
    }
    expect(unused).toEqual(unusedByDesign[l] ?? []);
  });

  it("Spanish marks nobody's gender", () => {
    // Turkish has none, and the app matches women with women and men with
    // men. One list for every Spanish text, the chart texts included.
    const texts = [
      ...leaves(CATALOGS.es),
      ...leaves(LEGAL_SECTIONS.es, 'legal'),
    ];
    const hits = texts.flatMap(({ path, value }) =>
      spanishGenderHits(String(render(value))).map((hit) => `${path}: ${hit}`),
    );
    expect(hits).toEqual([]);
  });

  it('names every language in its own name, with a locale tag', () => {
    for (const l of LANGUAGES) {
      expect(LANGUAGE_NAMES[l].length).toBeGreaterThan(0);
      expect(LOCALE_TAGS[l]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });

  it('writes a short date no reader can take for another day', () => {
    const format = (l: (typeof LANGUAGES)[number]): string =>
      new Date(Date.UTC(2026, 8, 10, 12)).toLocaleDateString(LOCALE_TAGS[l], {
        ...SHORT_DATE[l],
        timeZone: 'UTC',
      });
    // Turkish as it read before there was a second language.
    expect(format('tr')).toBe('10.09.2026');
    expect(format('en')).toBe('Sep 10, 2026');
    // Day first, as every Spanish-speaking country writes it.
    expect(format('es')).toBe('10/09/2026');
  });
});

/**
 * Arguments a function may ignore, because the language does not need
 * them: none so far. (A plural that says "one person" instead of "1" is
 * the kind of entry that would go here.)
 */
const unusedByDesign: Partial<Record<string, string[]>> = {};
