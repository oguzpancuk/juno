/**
 * Reference distribution for compatibility presentation (ADR-0009).
 *
 * ADR-0003 maps a weighted aspect sum to 0-100, and nobody had measured
 * where real charts land on it. This generates the product's own population
 * (births 1991-2005, ages 20-35 in 2026, Turkish coordinates), scores every
 * pair, and reports:
 *
 *  1. the band thresholds the UI needs. No number is shown, so what has to
 *     be calibrated is small: three cut points for the overall score's four
 *     bands and two per dimension for its three labels (ADR-0009 §2, §3);
 *  2. how often a match page could not be filled from the curated pairings
 *     alone, which is what makes the fill rule two-step (§5);
 *  3. the aspect counts, the Pluto-Venus share and the per-dimension medians
 *     the ADR quotes, so every figure in it refreshes from one run.
 *
 * It also checks the property decision 4 rests on: the five dimensions'
 * signed sums plus the two element bonuses reconstruct `harmony` and
 * `tension` exactly, so a weighted ordering is a reweighting of the same
 * quantity rather than a different one.
 *
 * Not part of the battery: it is the evidence for the ADR and the generator
 * for the committed threshold table.
 *
 *   npx tsx packages/astro/scripts/score-distribution.ts [out.json] [seed]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compatibility, elementsAgree, type Body } from '../src/compatibility';
import { DIMENSIONS, dimensionOf, type Dimension } from '../src/dimensions';
import { computeChart } from '../src/chart';
import { toPublicChart, type PublicChart } from '../src/public';

/** Charts, not pairs: the pair count is n(n-1)/2. */
const CHARTS = 1500;
const DEFAULT_SEED = 20260910;
const ELEMENT_BONUS = 2;
/** Equal-frequency bands: a signal that splits the population evenly. */
const BAND_CUTS = [25, 50, 75];
const LABEL_CUTS = [33, 67];

/**
 * The pairings the owner's product system puts on the primary match view
 * (2026-09-10). Unordered, like the dimension table.
 */
const CURATED: readonly (readonly [Body, Body])[] = [
  ['venus', 'mars'],
  ['venus', 'venus'],
  ['mars', 'mars'],
  ['ascendant', 'venus'],
  ['ascendant', 'mars'],
  ['moon', 'moon'],
  ['moon', 'venus'],
  ['sun', 'moon'],
  ['moon', 'mars'],
  ['moon', 'mercury'],
  ['mercury', 'mercury'],
  ['mercury', 'venus'],
  ['sun', 'mercury'],
  ['saturn', 'sun'],
  ['saturn', 'moon'],
  ['saturn', 'venus'],
  ['pluto', 'venus'],
];

const isPair = (pair: readonly [Body, Body], a: Body, b: Body): boolean =>
  (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a);

const isCurated = (a: Body, b: Body): boolean =>
  CURATED.some((pair) => isPair(pair, a, b));

/**
 * Deterministic generator. Determinism rests on IEEE-754 rounding being
 * correctly specified, not on integer arithmetic: the multiply exceeds 2^53,
 * so the low bits are rounding artefacts. Adequate for drawing a few
 * thousand birth instants, not a general-purpose PRNG.
 */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function population(count: number, seed: number): PublicChart[] {
  const random = makeRandom(seed);
  const charts: PublicChart[] = [];
  // Ages 20-35 during 2026: born on or after 1991-01-01 and before 2006-01-01.
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

/** ADR-0003's mapping, applied to one dimension's own terms. */
function reduce(harmony: number, tension: number): number {
  return 50 + (50 * (harmony - tension)) / (harmony + tension + 10);
}

const seedArg = process.argv[3];
const seed = seedArg === undefined ? DEFAULT_SEED : Number(seedArg);
const charts = population(CHARTS, seed);

const scores: number[] = [];
const byDimension: Record<Dimension, number[]> = {
  emotional: [],
  chemistry: [],
  communication: [],
  stability: [],
  growth: [],
};
let aspectTotal = 0;
let curatedAspectTotal = 0;
let plutoVenusPairs = 0;
let curatedShort = 0;
let curatedNoTension = 0;
let curatedBoth = 0;
let allShort = 0;
let allNoTension = 0;
let allBoth = 0;
let worstReconstruction = 0;

for (let i = 0; i < charts.length; i++) {
  for (let j = i + 1; j < charts.length; j++) {
    const a = charts[i];
    const b = charts[j];
    if (!a || !b) throw new Error(`missing chart at ${i} or ${j}`);
    const result = compatibility(a, b);
    scores.push(result.score);
    aspectTotal += result.aspects.length;

    const harmony: Record<Dimension, number> = {
      emotional: 0,
      chemistry: 0,
      communication: 0,
      stability: 0,
      growth: 0,
    };
    const tension: Record<Dimension, number> = {
      emotional: 0,
      chemistry: 0,
      communication: 0,
      stability: 0,
      growth: 0,
    };
    // Growth's label uses |term|; its signed sum is what reconstructs.
    let growthAbsolute = 0;

    for (const aspect of result.aspects) {
      const dimension = dimensionOf(aspect.planetA, aspect.planetB);
      if (dimension === null)
        throw new Error(`unmapped pairing ${aspect.planetA}|${aspect.planetB}`);
      if (aspect.term >= 0) harmony[dimension] += aspect.term;
      else tension[dimension] -= aspect.term;
      if (dimension === 'growth') growthAbsolute += Math.abs(aspect.term);
    }

    // ADR-0009 §1: the element bonus belongs to a dimension too.
    if (elementsAgree(a.planets.sun.sign, b.planets.sun.sign))
      harmony.stability += ELEMENT_BONUS;
    if (elementsAgree(a.planets.moon.sign, b.planets.moon.sign))
      harmony.emotional += ELEMENT_BONUS;

    let harmonySum = 0;
    let tensionSum = 0;
    for (const dimension of DIMENSIONS) {
      harmonySum += harmony[dimension];
      tensionSum += tension[dimension];
      const value =
        dimension === 'growth'
          ? reduce(growthAbsolute, 0)
          : reduce(harmony[dimension], tension[dimension]);
      byDimension[dimension].push(value);
    }
    worstReconstruction = Math.max(
      worstReconstruction,
      Math.abs(harmonySum - result.harmony),
      Math.abs(tensionSum - result.tension),
    );

    const positives = result.aspects.filter((x) => x.term > 0);
    const tensions = result.aspects.filter((x) => x.term < 0);
    const curated = result.aspects.filter((x) =>
      isCurated(x.planetA, x.planetB),
    );
    curatedAspectTotal += curated.length;
    if (curated.some((x) => isPair(['pluto', 'venus'], x.planetA, x.planetB)))
      plutoVenusPairs++;

    const curatedPositives = curated.filter((x) => x.term > 0).length;
    const curatedTensions = curated.filter((x) => x.term < 0).length;
    if (curatedPositives < 3) curatedShort++;
    if (curatedTensions === 0) curatedNoTension++;
    if (curatedPositives < 3 && curatedTensions === 0) curatedBoth++;
    if (positives.length < 3) allShort++;
    if (tensions.length === 0) allNoTension++;
    if (positives.length < 3 && tensions.length === 0) allBoth++;
  }
}

const pairs = scores.length;
const expected = (CHARTS * (CHARTS - 1)) / 2;
if (pairs !== expected)
  throw new Error(`scored ${pairs} pairs, expected ${expected}`);
// The generator repeats after ~10 466 draws and each chart costs three, so
// a larger CHARTS would silently emit duplicates and dependent pairs.
const distinct = new Set(charts.map((chart) => JSON.stringify(chart))).size;
if (distinct !== CHARTS)
  throw new Error(`${CHARTS} charts requested, ${distinct} distinct`);

scores.sort((x, y) => x - y);
const share = (n: number): string => ((n / pairs) * 100).toFixed(2);
const quantile = (values: number[], percentile: number): number => {
  const index = Math.min(
    values.length - 1,
    Math.floor((percentile / 100) * values.length),
  );
  const value = values[index];
  if (value === undefined) throw new Error('quantile of an empty sample');
  return value;
};

console.log(`charts=${CHARTS} pairs=${pairs} seed=${seed}`);
console.log(
  `score: min=${quantile(scores, 0)} p25=${quantile(scores, 25)} ` +
    `median=${quantile(scores, 50)} p75=${quantile(scores, 75)} ` +
    `p95=${quantile(scores, 95)} p99=${quantile(scores, 99)} ` +
    `max=${scores[pairs - 1] ?? 0}`,
);
for (const threshold of [70, 80, 86]) {
  console.log(
    `  at or above ${threshold}: ${share(scores.filter((s) => s >= threshold).length)} %`,
  );
}
console.log(
  `harmony/tension reconstruct from the five dimensions to within ` +
    worstReconstruction.toExponential(1),
);
console.log(
  `aspects per pair: ${(aspectTotal / pairs).toFixed(2)} over all 51 pairings, ` +
    `${(curatedAspectTotal / pairs).toFixed(2)} over the curated 17`,
);
console.log(`Pluto-Venus present in ${share(plutoVenusPairs)} % of pairs`);
console.log('match page gaps (curated 17 pairings):');
console.log(`  fewer than 3 positives: ${share(curatedShort)} %`);
console.log(`  no tension at all:      ${share(curatedNoTension)} %`);
console.log(
  `  both at once:           ${share(curatedBoth)} % (${curatedBoth})`,
);
console.log('match page gaps (all 51 pairings):');
console.log(`  fewer than 3 positives: ${share(allShort)} % (${allShort})`);
console.log(
  `  no tension at all:      ${share(allNoTension)} % (${allNoTension})`,
);
console.log(`  both at once:           ${share(allBoth)} % (${allBoth})`);

/** The whole calibrated surface: three cut points plus two per dimension. */
const bands = BAND_CUTS.map((cut) => quantile(scores, cut));
console.log(
  `overall band cuts (p${BAND_CUTS.join('/p')}): ${bands.join(', ')}`,
);

const labels: Record<string, number[]> = {};
for (const dimension of DIMENSIONS) {
  const values = byDimension[dimension];
  values.sort((x, y) => x - y);
  labels[dimension] = LABEL_CUTS.map((cut) =>
    Number(quantile(values, cut).toFixed(2)),
  );
  console.log(
    `  ${dimension.padEnd(14)} median=${quantile(values, 50).toFixed(1)} ` +
      `cuts=${(labels[dimension] ?? []).join(', ')}`,
  );
}

const out = process.argv[2];
if (out !== undefined) {
  const path = resolve(out);
  writeFileSync(
    path,
    `${JSON.stringify({ charts: CHARTS, pairs, seed, bands, labels }, null, 2)}\n`,
  );
  console.log(`wrote ${path}`);
}
