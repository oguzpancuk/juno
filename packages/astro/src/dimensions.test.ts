import { describe, expect, it } from 'vitest';
import { compatibility, BODIES, type Body } from './compatibility';
import {
  DIMENSIONS,
  dimensionOf,
  dimensionTerm,
  scoredPairings,
} from './dimensions';
import { computeChart } from './chart';
import { toPublicChart } from './public';

/**
 * ADR-0009 §1 is a table a human wrote and a human can misread. These assert
 * the properties the ADR claims for it rather than the table's contents.
 */
describe('dimension table', () => {
  it('covers every pairing ADR-0003 scores, exactly once', () => {
    const pairings = scoredPairings();
    expect(pairings).toHaveLength(51);
    for (const [a, b] of pairings) {
      expect(dimensionOf(a, b), `${a}|${b} is unmapped`).not.toBeNull();
      // Order must not matter: A × B and B × A are the same pairing.
      expect(dimensionOf(b, a)).toBe(dimensionOf(a, b));
    }
  });

  it('maps nothing that is not a scored pairing', () => {
    const scored = new Set(
      scoredPairings().map(([a, b]) => [a, b].sort().join('|')),
    );
    for (const a of BODIES) {
      for (const b of BODIES) {
        if (scored.has([a, b].sort().join('|'))) continue;
        expect(
          dimensionOf(a, b),
          `${a}|${b} should be generational`,
        ).toBeNull();
      }
    }
  });

  it('splits the 51 pairings 8/12/6/7/18', () => {
    const counts: Record<string, number> = {};
    for (const dimension of DIMENSIONS) counts[dimension] = 0;
    for (const [a, b] of scoredPairings()) {
      const dimension = dimensionOf(a, b);
      if (dimension === null) continue;
      counts[dimension] = (counts[dimension] ?? 0) + 1;
    }
    expect(counts).toEqual({
      emotional: 8,
      chemistry: 12,
      communication: 6,
      stability: 7,
      growth: 18,
    });
  });

  it('gives every aspect the engine emits a home', () => {
    // Four real charts across the cohort, so the aspects are ones the engine
    // actually produces rather than ones the table was written against.
    const charts = [
      {
        utc: new Date('1995-07-14T00:30:00Z'),
        latitude: 41.01,
        longitude: 28.98,
      },
      {
        utc: new Date('1990-01-01T09:00:00Z'),
        latitude: 39.93,
        longitude: 32.86,
      },
      {
        utc: new Date('2001-03-22T17:45:00Z'),
        latitude: 38.42,
        longitude: 27.14,
      },
      {
        utc: new Date('1988-11-03T04:15:00Z'),
        latitude: 36.9,
        longitude: 30.7,
      },
    ].map((input) => toPublicChart(computeChart(input)));

    let seen = 0;
    for (let i = 0; i < charts.length; i++) {
      for (let j = i + 1; j < charts.length; j++) {
        const a = charts[i];
        const b = charts[j];
        if (a === undefined || b === undefined) continue;
        for (const aspect of compatibility(a, b).aspects) {
          expect(
            dimensionOf(aspect.planetA, aspect.planetB),
            `${aspect.planetA}|${aspect.planetB} is unmapped`,
          ).not.toBeNull();
          seen++;
        }
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('counts tension as presence in growth only', () => {
    expect(dimensionTerm('growth', -3)).toBe(3);
    for (const dimension of DIMENSIONS) {
      if (dimension === 'growth') continue;
      expect(dimensionTerm(dimension, -3)).toBe(-3);
    }
  });

  it('places the pairings the ADR names in prose', () => {
    const cases: [Body, Body, string][] = [
      ['moon', 'mercury', 'emotional'],
      ['venus', 'mars', 'chemistry'],
      ['mercury', 'mercury', 'communication'],
      ['saturn', 'venus', 'stability'],
      ['sun', 'sun', 'stability'],
      ['pluto', 'venus', 'growth'],
    ];
    for (const [a, b, dimension] of cases) {
      expect(dimensionOf(a, b), `${a}|${b}`).toBe(dimension);
    }
  });
});
