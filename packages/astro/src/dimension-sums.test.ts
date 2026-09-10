import { describe, expect, it } from 'vitest';
import {
  compatibility,
  elementsAgree,
  type ChartForScoring,
} from './compatibility';
import { DIMENSIONS, dimensionOf } from './dimensions';
import { computeChart } from './chart';
import { toPublicChart } from './public';

/** ADR-0009 §4: the sums must be a reweighting of the same quantity. */

const round6 = (value: number): number => Number(value.toFixed(6));

function population(count: number, seed = 20260910): ChartForScoring[] {
  let state = seed;
  const random = (): number => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const from = Date.UTC(1991, 0, 1);
  const to = Date.UTC(2006, 0, 1);
  const charts: ChartForScoring[] = [];
  for (let i = 0; i < count; i++) {
    charts.push(
      toPublicChart(
        computeChart({
          utc: new Date(from + random() * (to - from)),
          latitude: 36 + random() * 6,
          longitude: 26 + random() * 19,
        }),
      ),
    );
  }
  return charts;
}

const charts = population(40);

function pairs(): [ChartForScoring, ChartForScoring][] {
  const out: [ChartForScoring, ChartForScoring][] = [];
  for (let i = 0; i < charts.length; i++) {
    for (let j = i + 1; j < charts.length; j++) {
      const a = charts[i];
      const b = charts[j];
      if (a && b) out.push([a, b]);
    }
  }
  return out;
}

describe('per-dimension sums', () => {
  it('reconstructs harmony and tension over a real population', () => {
    // Element bonuses are already inside Stability and Emotional, so adding
    // them again would overshoot by up to 4. Six decimals because float
    // associativity makes `===` fail on about half of pairs.
    for (const [a, b] of pairs()) {
      const result = compatibility(a, b);
      let harmony = 0;
      let tension = 0;
      for (const dimension of DIMENSIONS) {
        harmony += result.dimensions[dimension].harmony;
        tension += result.dimensions[dimension].tension;
      }
      expect(round6(harmony)).toBe(result.harmony);
      expect(round6(tension)).toBe(result.tension);
    }
  });

  it('counts every scored aspect into exactly one dimension', () => {
    for (const [a, b] of pairs()) {
      const result = compatibility(a, b);
      const counted = DIMENSIONS.reduce(
        (total, dimension) => total + result.dimensions[dimension].terms,
        0,
      );
      expect(counted).toBe(result.aspects.length);
    }
  });

  it('keeps Growth an absolute sum and the rest signed', () => {
    let sawGrowthTension = false;
    for (const [a, b] of pairs()) {
      const growth = compatibility(a, b).dimensions.growth;
      // The absolute sum is what Growth's label reads; harmony and tension
      // still split so the totals reconstruct.
      expect(round6(growth.absolute)).toBe(
        round6(growth.harmony + growth.tension),
      );
      if (growth.tension > 0) sawGrowthTension = true;
    }
    expect(sawGrowthTension).toBe(true);
  });

  it('puts the Sun bonus in Stability and the Moon bonus in Emotional', () => {
    // Which dimension owns which bonus is what a user reads as a label, and
    // the totals are invariant under swapping them — so nothing else here
    // would notice. Recomputed from the aspects, the bonus is the remainder.
    let sawSun = false;
    let sawMoon = false;
    for (const [a, b] of pairs()) {
      const result = compatibility(a, b);
      const fromAspects = (dimension: string): number => {
        let total = 0;
        for (const aspect of result.aspects) {
          if (dimensionOf(aspect.planetA, aspect.planetB) !== dimension)
            continue;
          if (aspect.term >= 0) total += aspect.term;
        }
        return Number(total.toFixed(6));
      };
      const sunAgrees = elementsAgree(a.planets.sun.sign, b.planets.sun.sign);
      const moonAgrees = elementsAgree(
        a.planets.moon.sign,
        b.planets.moon.sign,
      );
      expect(result.dimensions.stability.harmony).toBeCloseTo(
        fromAspects('stability') + (sunAgrees ? 2 : 0),
        6,
      );
      expect(result.dimensions.emotional.harmony).toBeCloseTo(
        fromAspects('emotional') + (moonAgrees ? 2 : 0),
        6,
      );
      if (sunAgrees) sawSun = true;
      if (moonAgrees) sawMoon = true;
    }
    expect(sawSun).toBe(true);
    expect(sawMoon).toBe(true);
  });

  it('is symmetric in its arguments', () => {
    for (const [a, b] of pairs().slice(0, 120)) {
      const forward = compatibility(a, b);
      const backward = compatibility(b, a);
      expect(forward.score).toBe(backward.score);
      for (const dimension of DIMENSIONS) {
        expect(backward.dimensions[dimension]).toEqual(
          forward.dimensions[dimension],
        );
      }
    }
  });

  it('lets a viewer weighting reorder discover without touching a score', () => {
    const [viewer, ...others] = charts;
    if (!viewer) throw new Error('no viewer');
    const scored = others.map((other) => {
      const result = compatibility(viewer, other);
      const weighted =
        3 * result.dimensions.chemistry.harmony +
        result.dimensions.stability.harmony;
      return { score: result.score, weighted };
    });
    const byScore = [...scored]
      .sort((x, y) => y.score - x.score)
      .map((x) => x.weighted);
    const byWeight = [...scored]
      .sort((x, y) => y.weighted - x.weighted)
      .map((x) => x.weighted);
    // The point of the item: a weighting produces a different order while
    // every displayed value stays the symmetric base.
    expect(byScore).not.toEqual(byWeight);
  });
});
