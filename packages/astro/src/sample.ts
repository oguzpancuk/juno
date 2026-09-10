import { computeChart } from './chart';
import { toPublicChart, type PublicChart } from './public';

/**
 * The measured population every calibration figure comes from: the
 * product's own cohort, births 1991–2005 (ages 20–35 in 2026) at Turkish
 * coordinates.
 *
 * Measurement infrastructure, not product code — nothing in `index.ts`
 * exports it. It lives here rather than in the script because the script,
 * the calibration test and the dimension-sums test all need the same
 * population, and three copies of a generator is how the figures drift
 * apart. ADR-0009's block is only reproducible if there is one of these.
 */

const DEFAULT_SEED = 20260910;

/**
 * A ceiling that holds for any seed. Where the generator's draws start
 * repeating depends on the seed — 13 360 at the default, 10 925 at 424242,
 * 11 154 at 1 — so this is not the real bound; `population` detects a
 * repeat itself and throws. This only keeps a typo from asking for a
 * million charts.
 */
export const MAX_SAMPLE_CHARTS = 3000;

/**
 * Deterministic. Determinism rests on IEEE-754 rounding being correctly
 * specified, not on integer arithmetic: the multiply exceeds 2^53, so the
 * low bits are rounding artefacts. Adequate for drawing a few thousand
 * birth instants, not a general-purpose PRNG.
 */
export function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

export function population(
  count: number,
  seed: number = DEFAULT_SEED,
): PublicChart[] {
  if (!Number.isInteger(count) || count < 2 || count > MAX_SAMPLE_CHARTS)
    throw new Error(
      `population: count must be an integer between 2 and ${MAX_SAMPLE_CHARTS}`,
    );
  const next = makeRandom(seed);
  // Seed-correct exhaustion check: the cycle length varies by seed, and a
  // recycled draw lands in a different slot and builds a *different* chart,
  // so a distinct-charts guard cannot see it. Watching the draws can.
  const seen = new Set<number>();
  const random = (): number => {
    const value = next();
    if (seen.has(value))
      throw new Error(
        `population: the generator repeated a draw after ${seen.size} of ` +
          `them at seed ${seed}; the pairs would not be independent`,
      );
    seen.add(value);
    return value;
  };
  const charts: PublicChart[] = [];
  const from = Date.UTC(1991, 0, 1);
  const to = Date.UTC(2006, 0, 1);
  for (let i = 0; i < count; i++) {
    charts.push(
      toPublicChart(
        computeChart({
          utc: new Date(from + random() * (to - from)),
          // Turkey's bounding box: the cohort the PRD describes.
          latitude: 36 + random() * 6,
          longitude: 26 + random() * 19,
        }),
      ),
    );
  }
  return charts;
}

export { DEFAULT_SEED };
