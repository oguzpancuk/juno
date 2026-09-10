import { describe, expect, it } from 'vitest';
import {
  BANDS,
  CALIBRATION,
  bandName,
  bandOf,
  bandText,
  dimensionLabelText,
  dimensionLevel,
  dimensionName,
} from './content';
import { compatibility, type ChartForScoring } from './compatibility';
import { DIMENSIONS } from './dimensions';
import { computeChart } from './chart';
import { toPublicChart } from './public';

/**
 * ADR-0009 §2/§3. The exact figures live in the ADR's block and are
 * reproduced by rerunning the script; what the battery checks is that the
 * committed calibration behaves the way the decision says it does, over a
 * bounded sample it can afford.
 */

const CHARTS = 300;

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

const charts = population(CHARTS);
const results = (() => {
  const out = [];
  for (let i = 0; i < charts.length; i++) {
    for (let j = i + 1; j < charts.length; j++) {
      const a = charts[i];
      const b = charts[j];
      if (a && b) out.push(compatibility(a, b));
    }
  }
  return out;
})();

describe('calibration', () => {
  it('puts a pair in the band its raw score falls in', () => {
    const [first, second, third] = CALIBRATION.bands;
    if (first === undefined || second === undefined || third === undefined)
      throw new Error('no band cuts');
    for (const result of results) {
      const expected =
        result.score < first
          ? 'quiet'
          : result.score < second
            ? 'even'
            : result.score < third
              ? 'strong'
              : 'rare';
      expect(bandOf(result.score)).toBe(expected);
    }
  });

  it('splits the population near-evenly across the four bands', () => {
    // Near, not exactly: the score is a discrete integer with a few per cent
    // of the mass sitting on each cut, so equal bands are unreachable.
    const counts: Record<string, number> = {};
    for (const band of BANDS) counts[band] = 0;
    for (const result of results) {
      const band = bandOf(result.score);
      counts[band] = (counts[band] ?? 0) + 1;
    }
    for (const band of BANDS) {
      const share = ((counts[band] ?? 0) / results.length) * 100;
      expect(share, `${band} holds ${share.toFixed(1)} %`).toBeGreaterThan(20);
      expect(share, `${band} holds ${share.toFixed(1)} %`).toBeLessThan(30);
    }
  });

  it('gives every band a name and a text, and no band a verdict', () => {
    const seen = new Set<string>();
    for (const result of results) seen.add(bandOf(result.score));
    expect(seen.size).toBe(BANDS.length);
    for (const band of BANDS) {
      const score =
        band === 'quiet'
          ? 0
          : band === 'even'
            ? (CALIBRATION.bands[0] ?? 0)
            : band === 'strong'
              ? (CALIBRATION.bands[1] ?? 0)
              : (CALIBRATION.bands[2] ?? 0);
      expect(bandName(score).length).toBeGreaterThan(2);
      expect(bandText(score).length).toBeGreaterThan(20);
    }
  });

  it('labels each dimension from its own cuts, not the overall ones', () => {
    // Stability's median sits well below the overall median, so scoring it
    // against the band cuts would call a typical pair bottom-band.
    const overall = CALIBRATION.bands[0];
    if (overall === undefined) throw new Error('no band cuts');
    for (const dimension of DIMENSIONS) {
      const cuts = CALIBRATION.labels[dimension];
      expect(cuts, `${dimension} has cuts`).toBeDefined();
      const [low, high] = cuts ?? [];
      if (low === undefined || high === undefined) throw new Error('bad cuts');
      expect(low).toBeLessThan(high);
      expect(low).not.toBe(overall);
    }
  });

  it('renders a dimension absent when no aspect counted into it', () => {
    let sawAbsent = false;
    let sawBonusOnly = false;
    for (const result of results) {
      for (const dimension of DIMENSIONS) {
        const sums = result.dimensions[dimension];
        const level = dimensionLevel(dimension, sums);
        if (sums.terms === 0) {
          expect(level).toBeNull();
          sawAbsent = true;
          // The element bonus can give an absent dimension a value; it still
          // renders absent, because the bonus is not an aspect.
          if (sums.harmony > 0) sawBonusOnly = true;
        } else {
          expect(level).not.toBeNull();
          if (level !== null)
            expect(dimensionLabelText(dimension, level).length).toBeGreaterThan(
              2,
            );
        }
      }
    }
    expect(sawAbsent).toBe(true);
    expect(sawBonusOnly).toBe(true);
  });

  it('names every dimension in Turkish', () => {
    const names = DIMENSIONS.map((d) => dimensionName(d));
    expect(new Set(names).size).toBe(DIMENSIONS.length);
    for (const name of names) expect(name.length).toBeGreaterThan(2);
  });

  it('reaches all three levels on some dimension', () => {
    const seen = new Set<string>();
    for (const result of results) {
      for (const dimension of DIMENSIONS) {
        const level = dimensionLevel(dimension, result.dimensions[dimension]);
        if (level !== null) seen.add(`${dimension}-${level}`);
      }
    }
    for (const dimension of DIMENSIONS) {
      for (const level of ['low', 'mid', 'high']) {
        expect(seen.has(`${dimension}-${level}`), `${dimension} ${level}`).toBe(
          true,
        );
      }
    }
  });
});
