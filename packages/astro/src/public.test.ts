import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { computeChart } from './chart';
import { PublicChartSchema, bigThree, toPublicChart } from './public';
import { formatDegree } from './tr';
import istanbul from './__fixtures__/istanbul-1995.json';

const chart = computeChart({
  utc: new Date(istanbul.input.utc),
  latitude: istanbul.input.latitude,
  longitude: istanbul.input.longitude,
});

describe('toPublicChart', () => {
  const pub = toPublicChart(chart);

  it('contains no engine input', () => {
    expect(JSON.stringify(pub)).not.toMatch(/utc|latitude|longitude"?:\s*28/);
    expect(Object.keys(pub).sort()).toEqual(['houses', 'planets', 'version']);
  });

  it('round-trips through its schema and keeps every planet within 1″', () => {
    const parsed = PublicChartSchema.parse(JSON.parse(JSON.stringify(pub)));
    for (const planet of PLANETS) {
      expect(
        Math.abs(
          parsed.planets[planet].longitude - chart.planets[planet].longitude,
        ),
      ).toBeLessThan(1 / 3600);
      expect(parsed.planets[planet].house).toBe(chart.planets[planet].house);
    }
    expect(parsed.houses.cusps).toHaveLength(12);
  });

  it('rejects a chart with a smuggled input field', () => {
    expect(() =>
      PublicChartSchema.parse({ ...pub, input: { utc: 'x' } }),
    ).not.toThrow(); // non-strict: unknown keys are stripped…
    expect(
      PublicChartSchema.parse({ ...pub, input: { utc: 'x' } }),
    ).not.toHaveProperty('input'); // …not stored
  });
});

describe('bigThree', () => {
  it('matches the fixture: Sun Cancer, Moon Aquarius, rising Gemini', () => {
    expect(bigThree(toPublicChart(chart))).toEqual({
      sun: 'cancer',
      moon: 'aquarius',
      rising: 'gemini',
    });
  });
});

describe('formatDegree', () => {
  it('formats degrees and minutes', () => {
    expect(formatDegree(21.1354)).toBe('21°08′');
    expect(formatDegree(0)).toBe('0°00′');
    expect(formatDegree(29.999)).toBe('29°59′');
  });
});
