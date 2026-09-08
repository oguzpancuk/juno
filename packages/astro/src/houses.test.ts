import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { computeChart } from './chart';
import { ReferenceChartSchema } from './fixtures';
import { computeHouses, houseOf, type Cusps } from './houses';
import { signedDelta } from './signs';
import ankara from './__fixtures__/ankara-1990.json';
import helsinki from './__fixtures__/helsinki-2001.json';
import istanbul from './__fixtures__/istanbul-1995.json';
import sydney from './__fixtures__/sydney-1988.json';

// ADR-0004: Ascendant, MC and cusps within 1° of the Swiss Ephemeris.
const TOLERANCE_DEG = 1;

const fixtures = [istanbul, ankara, helsinki, sydney].map((raw) =>
  ReferenceChartSchema.parse(raw),
);

const angularError = (a: number, b: number) => Math.abs(signedDelta(a - b));

describe.each(fixtures)('computeHouses · $id', (fixture) => {
  const { utc, latitude, longitude } = fixture.input;
  const houses = computeHouses(new Date(utc), latitude, longitude);

  it('Ascendant within 1° of the reference', () => {
    expect(angularError(houses.ascendant, fixture.ascendant)).toBeLessThan(
      TOLERANCE_DEG,
    );
  });

  it('MC within 1° of the reference', () => {
    expect(angularError(houses.mc, fixture.mc)).toBeLessThan(TOLERANCE_DEG);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const)(
    'cusp %i within 1° of the reference',
    (house) => {
      const actual = houses.cusps[house - 1] ?? Number.NaN;
      const expected = fixture.cusps[house - 1] ?? Number.NaN;
      expect(angularError(actual, expected)).toBeLessThan(TOLERANCE_DEG);
    },
  );

  it('cusps 1 and 10 are the Ascendant and MC; opposite cusps differ by 180°', () => {
    expect(houses.cusps[0]).toBe(houses.ascendant);
    expect(houses.cusps[9]).toBe(houses.mc);
    for (let i = 0; i < 6; i++) {
      const a = houses.cusps[i] ?? 0;
      const b = houses.cusps[i + 6] ?? 0;
      expect(angularError(a, b + 180)).toBeLessThan(1e-9);
    }
  });

  it('cusps advance in order around the zodiac', () => {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const start = houses.cusps[i] ?? 0;
      const end = houses.cusps[(i + 1) % 12] ?? 0;
      const span = ((end - start) % 360) + (end < start ? 360 : 0);
      expect(span).toBeGreaterThan(0);
      total += span;
    }
    expect(total).toBeCloseTo(360, 6);
  });
});

describe.each(fixtures)('planet houses · $id', (fixture) => {
  const chart = computeChart({
    utc: new Date(fixture.input.utc),
    latitude: fixture.input.latitude,
    longitude: fixture.input.longitude,
  });

  it.each(PLANETS)(
    '%s is in the same house as the Swiss Ephemeris',
    (planet) => {
      // fixture.planets[*].house comes from swe.house_pos (ecliptic latitude
      // 0), an independent oracle rather than our own houseOf on its numbers.
      expect(chart.planets[planet].house).toBe(fixture.planets[planet].house);
    },
  );
});

describe('houseOf', () => {
  const cusps: Cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  it('places a longitude on a cusp in the house that cusp starts', () => {
    expect(houseOf(0, cusps)).toBe(1);
    expect(houseOf(30, cusps)).toBe(2);
    expect(houseOf(329.999, cusps)).toBe(11);
    expect(houseOf(359.999, cusps)).toBe(12);
  });

  it('handles cusps that wrap past 360°', () => {
    // house 1 starts at 345°
    const wrapped: Cusps = [
      345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315,
    ];
    expect(houseOf(350, wrapped)).toBe(1);
    expect(houseOf(10, wrapped)).toBe(1);
    expect(houseOf(20, wrapped)).toBe(2);
    expect(houseOf(344, wrapped)).toBe(12);
  });
});

describe('latitude limit', () => {
  const input = { utc: new Date('2001-11-20T16:45:00Z'), longitude: 24.9384 };

  it('accepts 66°', () => {
    expect(() => computeChart({ ...input, latitude: 66 })).not.toThrow();
  });

  it('rejects beyond ±66° with a Placidus message', () => {
    expect(() => computeChart({ ...input, latitude: 66.01 })).toThrow(
      /Placidus/,
    );
    expect(() => computeChart({ ...input, latitude: -70 })).toThrow(/Placidus/);
  });

  it('computeHouses enforces the same cap when called directly', () => {
    expect(() => computeHouses(input.utc, 70, input.longitude)).toThrow(
      /Placidus/,
    );
    expect(() => computeHouses(input.utc, -66.5, input.longitude)).toThrow(
      /Placidus/,
    );
  });
});
