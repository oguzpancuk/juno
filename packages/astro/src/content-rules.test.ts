import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { SIGNS } from './signs';
import { CONTENT_FILES, KEY_SPACES } from './content';
import type { HouseNumber } from './houses';
import { SIGN_TR } from './tr';
import SYNASTRY_RAW from '../content/tr/synastry.json';

/**
 * Layering contract for the interpretation texts. One reading prints a
 * sign text, a house text and aspect texts side by side, so each layer
 * owns one thing: the sign text owns character and tempo, the house text
 * owns the life area, the aspect text owns the dynamic independent of
 * the signs involved. These rules are mechanical and lexicon-bound: they
 * catch the classes of contradiction found by review, not every one.
 */

const HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** Tempo and temperament words the sign text owns; banned in house texts. */
const SIGN_OWNED = [
  'hızlı',
  'yavaş',
  'aceleci',
  'sabırsız',
  'sabırlı',
  'dışa dönük',
  'içe dönük',
  'utangaç',
  'çekingen',
  'sıcakkanlı',
  'mesafeli',
] as const;

/** Sign and element flavour; banned in aspect texts (natal and synastry). */
const SIGN_FLAVOUR = [
  ...SIGNS.map((s) => SIGN_TR[s]),
  'ateşli',
  'ateş gibi',
  'toprak gibi',
  'su gibi',
  'hava gibi',
  'ateş burcu',
  'toprak burcu',
  'hava burcu',
  'su burcu',
] as const;

/** Antonym pairs that must not meet in one person's sign + house pair. */
const ANTONYMS: readonly (readonly [string, string])[] = [
  ['hızlı', 'yavaş'],
  ['sabırsız', 'sabırlı'],
  ['dışa dönük', 'içe dönük'],
  ['konuşkan', 'sessiz'],
  ['kolay güven', 'zor güven'],
  ['hemen ısın', 'yavaş ısın'],
  ['gösteriş', 'sahne arkası'],
  ['öne çık', 'geri dur'],
  ['ani', 'planlı'],
  ['soğuk', 'sıcak'],
];

const LETTER = 'a-zçğıöşüâîû';

const escape = (needle: string): string =>
  needle.toLocaleLowerCase('tr').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word, case-insensitive (Turkish) containment; sign names must not match inside "yayılır" or "boğar". */
function has(text: string, needle: string): boolean {
  return new RegExp(
    `(^|[^${LETTER}])${escape(needle)}(?=[^${LETTER}]|$)`,
    'u',
  ).test(text.toLocaleLowerCase('tr'));
}

/** Word-start containment so a stem matches its Turkish suffixed forms ("gösteriş" hits "gösterişli", "yavaş ısın" hits "yavaş ısınır"). */
function hasStem(text: string, stem: string): boolean {
  return new RegExp(`(^|[^${LETTER}])${escape(stem)}`, 'u').test(
    text.toLocaleLowerCase('tr'),
  );
}

/** A missing or empty key is a failure here, not a silently passing pair. */
function textOf(map: Readonly<Record<string, string>>, key: string): string {
  const text = map[key];
  if (!text) throw new Error(`content key missing or empty: ${key}`);
  return text;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

describe('content/tr · layering rules', () => {
  it('house texts do not carry sign-owned tempo or temperament words', () => {
    const hits: string[] = [];
    for (const [key, text] of Object.entries(CONTENT_FILES.houses)) {
      for (const w of SIGN_OWNED)
        if (hasStem(text, w)) hits.push(`${key}: ${w}`);
    }
    expect(hits).toEqual([]);
  });

  it('aspect texts are sign- and element-neutral', () => {
    const hits: string[] = [];
    for (const [key, text] of Object.entries(CONTENT_FILES.natalAspects)) {
      for (const w of SIGN_FLAVOUR)
        if (has(text, w)) hits.push(`natal ${key}: ${w}`);
    }
    for (const [key, entry] of Object.entries(SYNASTRY_RAW)) {
      for (const w of SIGN_FLAVOUR) {
        if (has(entry.meaning, w)) hits.push(`synastry ${key}: ${w}`);
        if (has(entry.question, w)) hits.push(`synastry ${key} question: ${w}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('no sentence is repeated between the sign and house layers', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [key, text] of Object.entries(CONTENT_FILES.signs))
      for (const s of sentences(text)) seen.set(s, `signs/${key}`);
    for (const [key, text] of Object.entries(CONTENT_FILES.houses))
      for (const s of sentences(text)) {
        const prior = seen.get(s);
        if (prior) dupes.push(`houses/${key} repeats ${prior}: "${s}"`);
      }
    expect(dupes).toEqual([]);
  });

  it('no sign + house pair of one planet meets an antonym pair (1,440 pairs)', () => {
    const hits: string[] = [];
    let pairs = 0;
    for (const planet of PLANETS) {
      for (const sign of SIGNS) {
        const s = textOf(CONTENT_FILES.signs, `${planet}-${sign}`);
        for (const house of HOUSES) {
          const h = textOf(CONTENT_FILES.houses, `${planet}-${house}`);
          pairs++;
          for (const [a, b] of ANTONYMS) {
            if (
              (hasStem(s, a) && hasStem(h, b)) ||
              (hasStem(s, b) && hasStem(h, a))
            )
              hits.push(`${planet}-${sign} × ${planet}-${house}: ${a}/${b}`);
          }
        }
      }
    }
    expect(pairs).toBe(1440);
    expect(hits).toEqual([]);
  });

  it('sign and house texts of one planet share no 4-word sequence (1,440 pairs)', () => {
    const grams = (text: string): Set<string> => {
      const words = text
        .toLocaleLowerCase('tr')
        .replace(/[^a-zçğıöşü\s]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 0);
      const out = new Set<string>();
      for (let i = 0; i + 4 <= words.length; i++)
        out.add(words.slice(i, i + 4).join(' '));
      return out;
    };
    const hits: string[] = [];
    for (const planet of PLANETS) {
      const houseGrams = HOUSES.map(
        (h) =>
          [h, grams(textOf(CONTENT_FILES.houses, `${planet}-${h}`))] as const,
      );
      for (const sign of SIGNS) {
        const sg = grams(textOf(CONTENT_FILES.signs, `${planet}-${sign}`));
        for (const [h, hg] of houseGrams) {
          const shared = [...sg].find((g) => hg.has(g));
          if (shared)
            hits.push(`${planet}-${sign} × ${planet}-${h}: "${shared}"`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('key spaces cover the pair scan', () => {
    const houseKeys = new Set(KEY_SPACES.houses());
    for (const planet of PLANETS)
      for (const house of HOUSES as readonly HouseNumber[])
        expect(houseKeys.has(`${planet}-${house}`)).toBe(true);
  });
});
