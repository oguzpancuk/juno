import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { computeChart } from './chart';
import {
  BODIES,
  aspectBetween,
  aspectKind,
  compatibility,
  elementsAgree,
  natalAspects,
  parseStarterKey,
  scoreFrom,
  starterKey,
  strongestOf,
  type ChartForScoring,
} from './compatibility';
import { toPublicChart } from './public';
import { signOf } from './signs';
import ankara from './__fixtures__/ankara-1990.json';
import istanbul from './__fixtures__/istanbul-1995.json';
import sydney from './__fixtures__/sydney-1988.json';

const publicOf = (fx: typeof istanbul) =>
  toPublicChart(
    computeChart({
      utc: new Date(fx.input.utc),
      latitude: fx.input.latitude,
      longitude: fx.input.longitude,
    }),
  );

/** Synthetic chart from body longitudes (houses irrelevant for scoring). */
function synthetic(
  longitudes: Record<(typeof BODIES)[number], number>,
): ChartForScoring {
  const planets = Object.fromEntries(
    PLANETS.map((p) => [
      p,
      {
        longitude: longitudes[p],
        sign: signOf(longitudes[p]),
        degree: longitudes[p] % 30,
        house: 1,
        retrograde: false,
      },
    ]),
  ) as ChartForScoring['planets'];
  return { planets, houses: { ascendant: longitudes.ascendant } };
}

describe('scoreFrom (ADR-0003)', () => {
  it('is 50 with no aspects, bounded, and rewards activity', () => {
    expect(scoreFrom(0, 0)).toBe(50);
    expect(scoreFrom(100, 0)).toBe(95);
    expect(scoreFrom(0, 100)).toBe(5);
    expect(scoreFrom(1000, 0)).toBeLessThanOrEqual(100);
    expect(scoreFrom(5, 5)).toBe(50);
    expect(scoreFrom(10, 2)).toBeGreaterThan(scoreFrom(5, 1)); // same ratio, more activity
  });
});

describe('aspectBetween (ADR-0003 table)', () => {
  it('exact Sun trine Sun: base 3, tight bonus capped at 1', () => {
    expect(aspectBetween('sun', 0, 'sun', 120)?.term).toBe(3);
  });

  it('Moon square Venus with 3° orb: 1 · 0.9 · −3 · 0.5', () => {
    expect(aspectBetween('moon', 10, 'venus', 103)).toEqual({
      planetA: 'moon',
      aspect: 'square',
      planetB: 'venus',
      orb: 3,
      term: -1.35,
    });
  });

  it('Saturn square Moon uses the −4 override; Saturn trine Moon does not', () => {
    expect(aspectBetween('saturn', 0, 'moon', 90)?.term).toBeCloseTo(
      -4 * 0.7,
      6,
    ); // orb 0 → factor 1
    expect(aspectBetween('moon', 0, 'saturn', 120)?.term).toBeCloseTo(
      3 * 0.7,
      6,
    );
  });

  it('outer-planet pairs get 0.75 × orb', () => {
    expect(aspectBetween('sun', 0, 'jupiter', 6.5)).toBeNull(); // 6.5 > 8·0.75
    expect(aspectBetween('sun', 0, 'jupiter', 5.9)).not.toBeNull();
    expect(aspectBetween('sun', 0, 'mars', 7.9)).not.toBeNull();
  });

  it('tight orb bonus: 1.5° square → factor (1 − 1.5/6) · 1.25 = 0.9375', () => {
    expect(aspectBetween('sun', 0, 'moon', 91.5)?.term).toBeCloseTo(
      -3 * 0.9375,
      6,
    );
  });

  it('scores an opposition to the Ascendant as a Descendant conjunction (+4 base)', () => {
    // Sun exactly on the other chart's Descendant: 0.8 · 1 · 4 · 1 = 3.2 harmony.
    expect(aspectBetween('sun', 0, 'ascendant', 180)?.term).toBeCloseTo(3.2, 6);
    expect(aspectBetween('ascendant', 0, 'moon', 180)?.aspect).toBe(
      'opposition',
    );
    expect(aspectBetween('ascendant', 0, 'moon', 180)?.term).toBeGreaterThan(0);
    // An ordinary opposition stays tense.
    expect(aspectBetween('sun', 0, 'moon', 180)?.term).toBeLessThan(0);
    // Saturn on the Descendant is not a Saturn-hard override (targets are Moon/Venus/Mars).
    expect(aspectBetween('saturn', 0, 'ascendant', 180)?.term).toBeCloseTo(
      0.7 * 0.8 * 4,
      6,
    );
    // The amendment applies to natal aspects too: Venus on the own Descendant.
    const natal = natalAspects(
      synthetic({
        sun: 10,
        moon: 100,
        mercury: 40,
        venus: 250,
        mars: 300,
        jupiter: 130,
        saturn: 160,
        uranus: 200,
        neptune: 20,
        pluto: 320,
        ascendant: 70,
      }),
    ).find(
      (a) =>
        a.aspect === 'opposition' &&
        [a.planetA, a.planetB].includes('ascendant') &&
        [a.planetA, a.planetB].includes('venus'),
    );
    expect(natal?.term).toBeGreaterThan(0);
  });

  it('returns null outside every orb', () => {
    expect(aspectBetween('sun', 0, 'moon', 45)).toBeNull();
  });
});

describe('aspectKind', () => {
  // The name says conjunction; the table says Saturn on the Moon is hard,
  // and the term carries that. The colour on screen has to follow the
  // term, or a card lands in the friction section painted as neutral.
  it('reads a hard conjunction as friction and a soft one as neither', () => {
    expect(aspectKind({ aspect: 'conjunction', term: -4 })).toBe('tension');
    expect(aspectKind({ aspect: 'conjunction', term: 3 })).toBe('conjunction');
  });

  it('follows the sign of the term for every other aspect', () => {
    expect(aspectKind({ aspect: 'trine', term: 2 })).toBe('harmony');
    expect(aspectKind({ aspect: 'sextile', term: 1 })).toBe('harmony');
    expect(aspectKind({ aspect: 'square', term: -2 })).toBe('tension');
    expect(aspectKind({ aspect: 'opposition', term: -1 })).toBe('tension');
  });
});

describe('compatibility', () => {
  // Hand-built pair: only Sun△Sun (exact) and Moon□Venus (3°) are in orb.
  // Other bodies sit just outside an orb (some within 1° of a boundary), so
  // the exact-list assertion below is what keeps this fixture honest when an
  // orb is retuned.
  // (found by a one-off greedy search over whole degrees; hand-verified below)
  const a = synthetic({
    sun: 0,
    moon: 100,
    mercury: 22,
    venus: 22,
    mars: 22,
    jupiter: 5,
    saturn: 5,
    uranus: 5,
    neptune: 5,
    pluto: 5,
    ascendant: 22,
  });
  const b = synthetic({
    sun: 120,
    moon: 31,
    mercury: 31,
    venus: 193,
    mars: 31,
    jupiter: 15,
    saturn: 15,
    uranus: 15,
    neptune: 15,
    pluto: 15,
    ascendant: 31,
  });

  it('finds exactly the hand-built aspects', () => {
    const result = compatibility(a, b);
    const pairs = result.aspects
      .map((x) => `${x.planetA}-${x.aspect}-${x.planetB}`)
      .sort();
    expect(pairs).toEqual(['moon-square-venus', 'sun-trine-sun']);
  });

  it('scores the hand-computed value: H = 3 + 2 (Suns fire) + 2 (Moons water/earth), T = 1.35 → 65', () => {
    const result = compatibility(a, b);
    expect(result.harmony).toBe(7);
    expect(result.tension).toBe(1.35);
    expect(result.score).toBe(65);
    expect(result.strongest?.planetA).toBe('sun');
    expect(result.strongest?.aspect).toBe('trine');
  });

  it('breaks an exact tie by the alphabetical (planetA, planetB, aspect) triple, whatever the input order', () => {
    const x = synthetic({
      sun: 300,
      moon: 0,
      mercury: 200,
      venus: 100,
      mars: 250,
      jupiter: 20,
      saturn: 70,
      uranus: 140,
      neptune: 230,
      pluto: 290,
      // 50, not 40: at 40 the Ascendant would oppose y.moon (220) exactly and,
      // scored as a Descendant conjunction (+3.2), break the 2.7 tie under test.
      ascendant: 50,
    });
    const y = synthetic({
      sun: 330,
      moon: 220,
      mercury: 275,
      venus: 120,
      mars: 335,
      jupiter: 165,
      saturn: 235,
      uranus: 25,
      neptune: 85,
      pluto: 355,
      ascendant: 315,
    });
    const { aspects, strongest } = compatibility(x, y);
    // x.moon–y.venus and x.venus–y.moon are both exact trines (2.7): the
    // alphabetical triple "moon-venus-trine" wins over "venus-moon-trine".
    expect(strongest).toMatchObject({
      planetA: 'moon',
      aspect: 'trine',
      planetB: 'venus',
    });
    expect(Math.abs(strongest?.term ?? 0)).toBeCloseTo(2.7, 6);
    expect(strongestOf([...aspects].reverse())).toEqual(strongest);
    expect(strongestOf([...aspects].sort(() => -1))).toEqual(strongest);
    // The mirrored call picks y.moon–x.venus, i.e. NOT the mirror of the above.
    expect(compatibility(y, x).strongest).toMatchObject({
      planetA: 'moon',
      planetB: 'venus',
    });
  });

  it('is symmetric in score and mirrors the strongest aspect', () => {
    const ab = compatibility(a, b);
    const ba = compatibility(b, a);
    expect(ba.score).toBe(ab.score);
    expect(ba.harmony).toBe(ab.harmony);
    expect(ba.tension).toBe(ab.tension);
    expect(ba.strongest).toEqual({
      ...ab.strongest,
      planetA: ab.strongest?.planetB,
      planetB: ab.strongest?.planetA,
    });
  });

  it('is symmetric and bounded on real charts', () => {
    const charts = [istanbul, ankara, sydney].map(publicOf);
    for (const x of charts) {
      for (const y of charts) {
        const xy = compatibility(x, y);
        const yx = compatibility(y, x);
        expect(xy.score).toBe(yx.score);
        expect(xy.score).toBeGreaterThanOrEqual(0);
        expect(xy.score).toBeLessThanOrEqual(100);
        expect(xy.aspects.length).toBe(yx.aspects.length);
      }
    }
  });

  it('skips generational (outer–outer) pairs', () => {
    const x = synthetic({
      sun: 0,
      moon: 0,
      mercury: 0,
      venus: 0,
      mars: 0,
      jupiter: 0,
      saturn: 0,
      uranus: 0,
      neptune: 0,
      pluto: 0,
      ascendant: 0,
    });
    const result = compatibility(x, x);
    expect(
      result.aspects.some(
        (p) => p.planetA === 'uranus' && p.planetB === 'pluto',
      ),
    ).toBe(false);
    expect(
      result.aspects.some((p) => p.planetA === 'sun' && p.planetB === 'pluto'),
    ).toBe(true);
  });
});

describe('starterKey', () => {
  it('encodes the strongest aspect in a<b orientation and round-trips', () => {
    const x = publicOf(istanbul);
    const y = publicOf(ankara);
    const key = starterKey(x, y);
    expect(key).toMatch(
      /^[a-z]+-(conjunction|sextile|square|trine|opposition)-[a-z]+$/,
    );
    const parsed = parseStarterKey(key ?? '');
    expect(parsed).not.toBeNull();
    expect(BODIES).toContain(parsed?.planetA);
    // Reversed charts give the mirrored key.
    const back = parseStarterKey(starterKey(y, x) ?? '');
    expect(back).toEqual({
      planetA: parsed?.planetB,
      aspect: parsed?.aspect,
      planetB: parsed?.planetA,
    });
  });

  it('rejects malformed keys', () => {
    expect(parseStarterKey('sun-trine')).toBeNull();
    expect(parseStarterKey('hey <script>')).toBeNull();
    expect(parseStarterKey('sun-quincunx-moon')).toBeNull();
  });
});

describe('elementsAgree', () => {
  it('same element or complementary pair', () => {
    expect(elementsAgree('aries', 'leo')).toBe(true);
    expect(elementsAgree('aries', 'gemini')).toBe(true); // fire–air
    expect(elementsAgree('taurus', 'cancer')).toBe(true); // earth–water
    expect(elementsAgree('aries', 'taurus')).toBe(false);
    expect(elementsAgree('cancer', 'libra')).toBe(false);
  });
});
