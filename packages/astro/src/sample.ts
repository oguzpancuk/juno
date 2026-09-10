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
 * The generator's draws first repeat at 13 361, and each chart costs three,
 * so past this the population silently contains dependent pairs.
 */
export const MAX_SAMPLE_CHARTS = 4453;

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
  const random = makeRandom(seed);
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
