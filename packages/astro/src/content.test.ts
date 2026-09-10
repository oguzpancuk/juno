import { DIMENSIONS } from './dimensions';
import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { computeChart } from './chart';
import {
  BODIES,
  OUTER_BODIES,
  compatibility,
  natalAspects,
  type Aspect,
  type Body,
  type ChartForScoring,
} from './compatibility';
import { toPublicChart } from './public';
import { signOf } from './signs';
import istanbul from './__fixtures__/istanbul-1995.json';
import {
  CONTENT_FILES,
  IMPOSSIBLE_KEYS,
  KEY_SPACES,
  bandOf,
  CALIBRATION,
  PRIMARY_PLACEMENTS,
  aspectTitle,
  placementLabel,
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

    it('every sentence has at least four words (no telegraphic fragments)', () => {
      const offenders: string[] = [];
      for (const [key, text] of Object.entries(actual)) {
        const sentences = text
          .split(/(?<=[.!?…])\s+/)
          .filter((x) => x.trim().length > 0);
        if (sentences.some((x) => x.trim().split(/\s+/).length < 4))
          offenders.push(key);
      }
      expect(offenders).toEqual([]);
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
    const [first, second, third] = CALIBRATION.bands;
    if (first === undefined || second === undefined || third === undefined)
      throw new Error('no band cuts');
    expect(bandOf(0)).toBe('quiet');
    expect(bandOf(first - 1)).toBe('quiet');
    expect(bandOf(first)).toBe('even');
    expect(bandOf(second - 1)).toBe('even');
    expect(bandOf(second)).toBe('strong');
    expect(bandOf(third - 1)).toBe('strong');
    expect(bandOf(third)).toBe('rare');
    expect(bandOf(100)).toBe('rare');
  });

  it('synastry questions end with a question mark', () => {
    expect(
      synastryText('sun', 'conjunction', 'moon').question.endsWith('?'),
    ).toBe(true);
  });
});

describe('engine emission matches the key space', () => {
  // Synthesize every body pair at every aspect angle and assert the engine's
  // aspect resolves to a text, so the key space cannot drift from the engine.
  const angles = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  } as const;
  const PARK = 200;
  const OUTER_PAIR = (a: Body, b: Body) =>
    OUTER_BODIES.has(a) && OUTER_BODIES.has(b);

  it('every natal aspect the engine can emit has a text', () => {
    for (let i = 0; i < BODIES.length; i++) {
      for (let j = i + 1; j < BODIES.length; j++) {
        const a = BODIES[i] ?? 'sun';
        const b = BODIES[j] ?? 'sun';
        for (const [aspect, angle] of Object.entries(angles) as [
          Aspect,
          number,
        ][]) {
          const key = `${a}-${aspect}-${b}`;
          if (IMPOSSIBLE_KEYS.has(key)) continue; // never reached by a real chart
          const hit = natalAspects(synthetic(a, 0, b, angle, PARK)).find(
            (x) => x.planetA === a && x.planetB === b,
          );
          if (OUTER_PAIR(a, b)) {
            expect(hit, key).toBeUndefined(); // generational pair: engine skips, key space skips
            continue;
          }
          expect(hit, key).toBeDefined(); // a scorable pair must be emitted
          if (!hit) continue;
          expect(hit.aspect, key).toBe(aspect);
          expect(natalAspectText(a, aspect, b).length, key).toBeGreaterThan(20);
        }
      }
    }
  });

  it('every synastry aspect the engine can emit has a text and a question', () => {
    for (let i = 0; i < BODIES.length; i++) {
      for (let j = i; j < BODIES.length; j++) {
        const a = BODIES[i] ?? 'sun';
        const b = BODIES[j] ?? 'sun';
        for (const [aspect, angle] of Object.entries(angles) as [
          Aspect,
          number,
        ][]) {
          const x = synthetic(a, 0, a, 0, PARK);
          const y = synthetic(b, angle, b, angle, PARK + 37);
          const hit = compatibility(x, y).aspects.find(
            (h) => h.planetA === a && h.planetB === b,
          );
          if (OUTER_PAIR(a, b)) {
            expect(hit).toBeUndefined();
            continue;
          }
          expect(hit, `${a}-${aspect}-${b}`).toBeDefined();
          if (!hit) continue;
          expect(hit.aspect, `${a}-${aspect}-${b}`).toBe(aspect);
          const t = synastryText(a, aspect, b);
          expect(t.meaning.length).toBeGreaterThan(20);
          expect(t.question.endsWith('?')).toBe(true);
        }
      }
    }
  });
});

describe('natalAspects on a reference chart', () => {
  it('finds the Istanbul 1995 majors with the ADR table', () => {
    const chart = toPublicChart(
      computeChart({
        utc: new Date(istanbul.input.utc),
        latitude: istanbul.input.latitude,
        longitude: istanbul.input.longitude,
      }),
    );
    const keys = natalAspects(chart).map(
      (a) => `${a.planetA}-${a.aspect}-${a.planetB}`,
    );
    expect(keys).toContain('mars-opposition-saturn'); // 175.7° vs 354.7°: 179.0° apart
    expect(keys).toContain('mercury-conjunction-venus'); // 95.8° vs 100.7°
    expect(
      keys.some((k) =>
        /^(jupiter|saturn|uranus|neptune|pluto)-\w+-(jupiter|saturn|uranus|neptune|pluto)$/.test(
          k,
        ),
      ),
    ).toBe(false);
    const terms = natalAspects(chart).map((a) => Math.abs(a.term));
    expect([...terms].sort((p, q) => q - p)).toEqual(terms);
  });
});

/** Chart with `a` at `lonA` and `b` at `lonB`; every other body parked from `park`, 11° apart. */
function synthetic(
  a: Body,
  lonA: number,
  b: Body,
  lonB: number,
  park: number,
): ChartForScoring {
  const lon = Object.fromEntries(
    BODIES.map((body, i) => [body, (park + i * 11) % 360]),
  ) as Record<Body, number>; // why: keys are exactly BODIES
  lon[a] = lonA;
  lon[b] = lonB;
  const planets = Object.fromEntries(
    PLANETS.map((p) => [
      p,
      {
        longitude: lon[p],
        sign: signOf(lon[p]),
        degree: lon[p] % 30,
        house: 1 as const,
        retrograde: false,
      },
    ]),
  ) as ChartForScoring['planets']; // why: keys are exactly PLANETS
  return { planets, houses: { ascendant: lon.ascendant } };
}

describe('presentation content', () => {
  it('names all six primary placements', () => {
    for (const placement of PRIMARY_PLACEMENTS) {
      expect(placementLabel(placement).length).toBeGreaterThan(2);
    }
    const labels = PRIMARY_PLACEMENTS.map((p) => placementLabel(p));
    expect(new Set(labels).size).toBe(PRIMARY_PLACEMENTS.length);
  });

  it('has three title variants for every dimension and valence', () => {
    const seen = new Set<string>();
    for (const dimension of DIMENSIONS) {
      for (const term of [1, -1]) {
        const variants = new Set<string>();
        for (let i = 0; i < 3; i++) {
          // Feeding the titles already taken walks the variants.
          variants.add(aspectTitle(dimension, term, `k${i}`, variants));
        }
        expect(variants.size, `${dimension} ${term}`).toBe(3);
        for (const title of variants) {
          expect(seen.has(title), `${title} is used twice`).toBe(false);
          seen.add(title);
        }
      }
    }
    expect(seen.size).toBe(DIMENSIONS.length * 2 * 3);
  });
});
