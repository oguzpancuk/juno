import { describe, expect, it } from 'vitest';
import {
  CONTENT_FILES,
  KEY_SPACES,
  bandOf,
  elementKey,
  natalAspectText,
  pairKey,
  signText,
  synastryText,
} from './content';

// The completeness contract: every key the engine can emit has a snippet,
// and no file carries a key the engine can never emit (typos surface).
describe.each(Object.keys(KEY_SPACES) as (keyof typeof KEY_SPACES)[])(
  'content/tr · %s',
  (file) => {
    const expected = KEY_SPACES[file]();
    const actual = CONTENT_FILES[file];

    it(`has all ${expected.length} keys`, () => {
      const missing = expected.filter((k) => !(k in actual));
      expect(missing).toEqual([]);
    });

    it('has no unknown keys', () => {
      const known = new Set(expected);
      expect(Object.keys(actual).filter((k) => !known.has(k))).toEqual([]);
    });

    it('every text is 1–2 sentences (≤ 320 chars) and ends with punctuation', () => {
      for (const [key, text] of Object.entries(actual)) {
        expect(text.length, key).toBeLessThanOrEqual(320);
        expect(/[.!?…]$/.test(text), key).toBe(true);
      }
    });
  },
);

describe('keys', () => {
  it('canonicalises pair order by BODIES index', () => {
    expect(pairKey('moon', 'trine', 'sun')).toBe('sun-trine-moon');
    expect(pairKey('sun', 'trine', 'moon')).toBe('sun-trine-moon');
    expect(pairKey('ascendant', 'square', 'pluto')).toBe(
      'pluto-square-ascendant',
    );
    expect(natalAspectText('venus', 'square', 'moon')).toBe(
      natalAspectText('moon', 'square', 'venus'),
    );
    expect(synastryText('mars', 'opposition', 'sun')).toEqual(
      synastryText('sun', 'opposition', 'mars'),
    );
  });

  it('element keys are unordered', () => {
    expect(elementKey('sun', 'water', 'fire')).toBe('sun:fire-water');
  });

  it('sign text exists for planets and the Ascendant', () => {
    expect(signText('sun', 'cancer').length).toBeGreaterThan(20);
    expect(signText('ascendant', 'gemini').length).toBeGreaterThan(20);
  });

  it('bands follow the ADR thresholds', () => {
    expect(bandOf(0)).toBe('very-low');
    expect(bandOf(39)).toBe('very-low');
    expect(bandOf(40)).toBe('low');
    expect(bandOf(50)).toBe('low');
    expect(bandOf(55)).toBe('mid');
    expect(bandOf(69)).toBe('mid');
    expect(bandOf(70)).toBe('high');
    expect(bandOf(85)).toBe('very-high');
    expect(bandOf(100)).toBe('very-high');
  });

  it('synastry questions end with a question mark', () => {
    expect(
      synastryText('sun', 'conjunction', 'moon').question.endsWith('?'),
    ).toBe(true);
  });
});
