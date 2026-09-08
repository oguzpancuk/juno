import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { SIGNS } from './signs';
import { CONTENT_FILES, KEY_SPACES } from './content';
import type { HouseNumber } from './houses';
import { SIGN_TR } from './tr';

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

const LETTER = 'a-zçğıöşü';

/** Whole-word, case-insensitive (Turkish) containment; sign names must not match inside "yayılır" or "boğar". */
function has(text: string, needle: string): boolean {
  const n = needle
    .toLocaleLowerCase('tr')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^${LETTER}])${n}(?=[^${LETTER}]|$)`, 'u').test(
    text.toLocaleLowerCase('tr'),
  );
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

describe('content/tr · layering rules', () => {
  it('house texts do not carry sign-owned tempo or temperament words', () => {
    const hits: string[] = [];
    for (const [key, text] of Object.entries(CONTENT_FILES.houses)) {
      for (const w of SIGN_OWNED) if (has(text, w)) hits.push(`${key}: ${w}`);
    }
    expect(hits).toEqual([]);
  });

  it('aspect texts are sign- and element-neutral', () => {
    const hits: string[] = [];
    for (const [key, text] of Object.entries(CONTENT_FILES.natalAspects)) {
      for (const w of SIGN_FLAVOUR)
        if (has(text, w.toLocaleLowerCase('tr')))
          hits.push(`natal ${key}: ${w}`);
    }
    for (const [key, meaning] of Object.entries(CONTENT_FILES.synastry)) {
      for (const w of SIGN_FLAVOUR)
        if (has(meaning, w.toLocaleLowerCase('tr')))
          hits.push(`synastry ${key}: ${w}`);
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
        const s = CONTENT_FILES.signs[`${planet}-${sign}`] ?? '';
        for (const house of HOUSES) {
          const h = CONTENT_FILES.houses[`${planet}-${house}`] ?? '';
          pairs++;
          for (const [a, b] of ANTONYMS) {
            if ((has(s, a) && has(h, b)) || (has(s, b) && has(h, a)))
              hits.push(`${planet}-${sign} × ${planet}-${house}: ${a}/${b}`);
          }
        }
      }
    }
    expect(pairs).toBe(1440);
    expect(hits).toEqual([]);
  });

  it('key spaces cover the pair scan', () => {
    const houseKeys = new Set(KEY_SPACES.houses());
    for (const planet of PLANETS)
      for (const house of HOUSES as readonly HouseNumber[])
        expect(houseKeys.has(`${planet}-${house}`)).toBe(true);
  });
});
