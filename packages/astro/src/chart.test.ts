import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { computeChart } from './chart';
import { ReferenceChartSchema } from './fixtures';
import { signOf, signedDelta } from './signs';
import ankara from './__fixtures__/ankara-1990.json';
import helsinki from './__fixtures__/helsinki-2001.json';
import istanbul from './__fixtures__/istanbul-1995.json';

// ADR-0004: every planet within 1° of the Swiss Ephemeris reference.
const TOLERANCE_DEG = 1;

const fixtures = [istanbul, ankara, helsinki].map((raw) =>
  ReferenceChartSchema.parse(raw),
);

describe.each(fixtures)('computeChart · $id', (fixture) => {
  const chart = computeChart({
    utc: new Date(fixture.input.utc),
    latitude: fixture.input.latitude,
    longitude: fixture.input.longitude,
  });

  it.each(PLANETS)('%s matches the reference within 1°', (planet) => {
    const actual = chart.planets[planet];
    const expected = fixture.planets[planet];
    const delta = Math.abs(signedDelta(actual.longitude - expected.longitude));
    expect(delta).toBeLessThan(TOLERANCE_DEG);
    expect(actual.sign).toBe(signOf(expected.longitude));
    expect(actual.retrograde).toBe(expected.retrograde);
  });

  it('keeps sign and degree consistent with the longitude', () => {
    for (const planet of PLANETS) {
      const { longitude, sign, degree } = chart.planets[planet];
      expect(sign).toBe(signOf(longitude));
      expect(degree).toBeGreaterThanOrEqual(0);
      expect(degree).toBeLessThan(30);
      expect(longitude - degree).toBeCloseTo(
        Math.floor(longitude / 30) * 30,
        9,
      );
    }
  });
});

describe('computeChart · determinism and validation', () => {
  const input = {
    utc: new Date('1995-07-14T00:30:00Z'),
    latitude: 41.0082,
    longitude: 28.9784,
  };

  it('returns identical results for equal inputs', () => {
    expect(computeChart(input)).toEqual(computeChart({ ...input }));
  });

  it('never marks the Sun or Moon retrograde', () => {
    const chart = computeChart(input);
    expect(chart.planets.sun.retrograde).toBe(false);
    expect(chart.planets.moon.retrograde).toBe(false);
  });

  it('agrees with the Swiss Ephemeris across a station (Mercury, 2024-01-02 ~03:07Z)', () => {
    // A forward difference flipped at 02:37Z; the central difference and the
    // Swiss Ephemeris instantaneous speed both flip between 03:05 and 03:10.
    const at = (iso: string) =>
      computeChart({ ...input, utc: new Date(iso) }).planets.mercury.retrograde;
    expect(at('2024-01-02T02:50:00Z')).toBe(true);
    expect(at('2024-01-02T03:00:00Z')).toBe(true);
    expect(at('2024-01-02T03:20:00Z')).toBe(false);
  });

  it('rejects an invalid date', () => {
    expect(() => computeChart({ ...input, utc: new Date('nope') })).toThrow();
  });

  it('rejects out-of-range coordinates', () => {
    expect(() => computeChart({ ...input, latitude: 90.5 })).toThrow();
    expect(() => computeChart({ ...input, longitude: -181 })).toThrow();
  });
});
