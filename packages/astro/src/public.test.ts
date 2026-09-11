import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { computeChart } from './chart';
import { PublicChartSchema, bigThree, toPublicChart } from './public';
import { degreeInSign, roundLongitude, signOf } from './signs';
import { describeAspectTr, formatDegree, natalAspectTitleTr } from './tr';
import istanbul from './__fixtures__/istanbul-1995.json';

const chart = computeChart({
  utc: new Date(istanbul.input.utc),
  latitude: istanbul.input.latitude,
  longitude: istanbul.input.longitude,
});

describe('degreeInSign', () => {
  // Both the planet degrees in `toPublicChart` and the Ascendant's in
  // `natalReading` go through this; raw `% 30` is inexact and
  // `formatDegree` floors, so an arcminute goes missing about once in
  // 1,650 charts. A displayed degree is meant to match astro.com
  // (ADR-0009), so the rounding is part of the contract.
  it('rounds away the float modulo that would print a minute low', () => {
    expect(30.15 % 30).toBeLessThan(0.15); // the trap
    expect(degreeInSign(30.15)).toBe(0.15);
    expect(formatDegree(degreeInSign(30.15))).toBe('0°09′');
    expect(formatDegree(30.15 % 30)).toBe('0°08′');
  });

  it('folds a longitude into its own sign, and never onto the boundary', () => {
    expect(degreeInSign(0)).toBe(0);
    expect(degreeInSign(359.9)).toBe(29.9);
    expect(degreeInSign(-1)).toBe(29);
    // A point in the last arcsecond of a sign rounds into the next one,
    // and `signOf(roundLongitude(...))` agrees: Taurus at 0°00′, not
    // Aries at 30°00′ and not Aries at 0°00′.
    expect(degreeInSign(29.99996)).toBe(0);
    expect(signOf(roundLongitude(29.99996))).toBe('taurus');
  });
});

describe('toPublicChart', () => {
  const pub = toPublicChart(chart);

  it('contains no engine input', () => {
    expect(Object.keys(pub).sort()).toEqual(['houses', 'planets', 'version']);
    expect(JSON.stringify(pub)).not.toMatch(/"(utc|latitude|input)"/);
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

  it('strips unknown keys such as a smuggled input field', () => {
    // The DB CHECK is the hard guard; the schema keeps the stored shape clean.
    expect(
      PublicChartSchema.parse({ ...pub, input: { utc: 'x' } }),
    ).not.toHaveProperty('input');
  });

  it('keeps degree at 4 decimals (float modulo is inexact)', () => {
    const edge = {
      ...chart,
      planets: {
        ...chart.planets,
        sun: { ...chart.planets.sun, longitude: 30.15 },
      },
    };
    expect(toPublicChart(edge).planets.sun.degree).toBe(0.15);
    expect(formatDegree(toPublicChart(edge).planets.sun.degree)).toBe('0°09′');
  });

  it('never emits 360 or a degree of 30 after rounding at a boundary', () => {
    const edge = {
      ...chart,
      planets: {
        ...chart.planets,
        sun: {
          ...chart.planets.sun,
          longitude: 359.99996,
          degree: 29.99996,
          sign: 'pisces' as const,
        },
      },
      houses: { ...chart.houses, ascendant: 359.99996 },
    };
    const out = toPublicChart(edge);
    expect(out.planets.sun.longitude).toBe(0);
    expect(out.planets.sun.degree).toBe(0);
    expect(out.planets.sun.sign).toBe('aries');
    expect(out.houses.ascendant).toBe(0);
    expect(bigThree(out).rising).toBe('aries');
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

describe('describeAspectTr', () => {
  it('frames an opposition to the Ascendant as a Descendant contact', () => {
    expect(
      describeAspectTr({
        planetA: 'sun',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe("Güneş'in onun Alçalan'ında.");
    expect(
      describeAspectTr({
        planetA: 'ascendant',
        aspect: 'opposition',
        planetB: 'moon',
      }),
    ).toBe("Onun Ay'ı senin Alçalan'ında.");
    expect(
      describeAspectTr({
        planetA: 'ascendant',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe("Yükselenleriniz birbirinin Alçalan'ında.");
    expect(
      describeAspectTr({
        planetA: 'ascendant',
        aspect: 'square',
        planetB: 'moon',
      }),
    ).toContain('kare');
  });
  it('renders the why-line with Turkish suffixes', () => {
    expect(
      describeAspectTr({ planetA: 'moon', aspect: 'trine', planetB: 'venus' }),
    ).toBe("Ay'ın onun Venüs'üyle üçgen açı yapıyor.");
    expect(
      describeAspectTr({
        planetA: 'sun',
        aspect: 'conjunction',
        planetB: 'ascendant',
      }),
    ).toBe("Güneş'in onun Yükselen'iyle kavuşuyor.");
    expect(
      describeAspectTr({
        planetA: 'saturn',
        aspect: 'square',
        planetB: 'mars',
      }),
    ).toBe("Satürn'ün onun Mars'ıyla kare açı yapıyor.");
  });
});

describe('natalAspectTitleTr', () => {
  it('titles an Ascendant opposition as a Descendant placement', () => {
    expect(
      natalAspectTitleTr({
        planetA: 'venus',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe("Venüs Alçalan'da");
    expect(
      natalAspectTitleTr({ planetA: 'sun', aspect: 'square', planetB: 'mars' }),
    ).toBe('Güneş kare Mars');
  });
});
