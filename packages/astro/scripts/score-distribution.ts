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
 * It also checks the property decision 4 rests on: each dimension's own
 * harmony and tension sums — with the two element bonuses already folded
 * into Stability and Emotional — add back up to `compatibility()`'s totals,
 * so a weighted ordering is a reweighting of the same quantity rather than a
 * different one. A single signed sum per dimension would not do: it collapses
 * to `H − T` and the split cannot be recovered.
 *
 * Not part of the battery: it is the evidence for the ADR and the generator
 * for the committed threshold table.
 *
 *   npx tsx packages/astro/scripts/score-distribution.ts [--seed=N] [out.json]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compatibility, elementsAgree, type Body } from '../src/compatibility';
import {
  DIMENSIONS,
  dimensionOf,
  dimensionTerm,
  type Dimension,
} from '../src/dimensions';
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

const args = process.argv.slice(2);
// Anything starting with a dash is an option, so a one-dash `-seed=5` is
// rejected rather than silently becoming the output path.
const unknown = args.find(
  (arg) => arg.startsWith('-') && !arg.startsWith('--seed='),
);
if (unknown !== undefined)
  throw new Error(
    unknown === '--seed' || unknown === '-seed'
      ? '--seed takes an = sign: --seed=20260910'
      : `unknown option: ${unknown}`,
  );
const seedFlags = args.filter((arg) => arg.startsWith('--seed='));
if (seedFlags.length > 1)
  throw new Error(`--seed given ${seedFlags.length} times`);
const seedFlag = seedFlags[0];
const seed =
  seedFlag === undefined
    ? DEFAULT_SEED
    : Number(seedFlag.slice('--seed='.length));
// A negative or fractional seed drives the generator out of the declared
// cohort while both guards below stay green, so it is rejected here.
if (!Number.isInteger(seed) || seed <= 0)
  throw new Error(`--seed must be a positive integer, got "${seedFlag ?? ''}"`);
const positionals = args.filter((arg) => !arg.startsWith('-'));
if (positionals.length > 1)
  throw new Error(
    `expected at most one output path, got ${positionals.length}`,
  );
const out = positionals[0];
const charts = population(CHARTS, seed);

const scores: number[] = [];
/** ADR-0009 §3's sensitivity argument is about the unrounded tail. */
const unrounded: number[] = [];
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
let allEmptyWhy = 0;
let allShortOnly = 0;
let allBothEmpty = 0;
let worstReconstruction = 0;
let mixedSign = 0;
let mixedSignTerms = 0;
const zeroed = (): Record<Dimension, number> => ({
  emotional: 0,
  chemistry: 0,
  communication: 0,
  stability: 0,
  growth: 0,
});
const termTotals = zeroed();
const absent = zeroed();
const bonusOnly = zeroed();

for (let i = 0; i < charts.length; i++) {
  for (let j = i + 1; j < charts.length; j++) {
    const a = charts[i];
    const b = charts[j];
    if (!a || !b) throw new Error(`missing chart at ${i} or ${j}`);
    const result = compatibility(a, b);
    scores.push(result.score);
    unrounded.push(reduce(result.harmony, result.tension));
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
    // Growth's label reads |term| (dimensionTerm); its harmony and tension
    // sums are what reconstruct.
    let growthAbsolute = 0;
    const terms: Record<Dimension, number> = {
      emotional: 0,
      chemistry: 0,
      communication: 0,
      stability: 0,
      growth: 0,
    };

    for (const aspect of result.aspects) {
      const dimension = dimensionOf(aspect.planetA, aspect.planetB);
      if (dimension === null)
        throw new Error(`unmapped pairing ${aspect.planetA}|${aspect.planetB}`);
      terms[dimension]++;
      termTotals[dimension]++;
      if (aspect.term >= 0) harmony[dimension] += aspect.term;
      else tension[dimension] -= aspect.term;
      if (dimension === 'growth')
        growthAbsolute += dimensionTerm(dimension, aspect.term);
    }

    // Harmony from aspect terms alone, kept so the mixed-sign share can be
    // reported both ways: the bonus is not a term.
    const termHarmony = { ...harmony };

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
      // ADR-0009 §2: a dimension with no aspect renders absent, element bonus
      // or not, so it must not sit in the sample its labels are cut from.
      if (terms[dimension] === 0) {
        absent[dimension]++;
        if (harmony[dimension] > 0) bonusOnly[dimension]++;
        continue;
      }
      byDimension[dimension].push(
        dimension === 'growth'
          ? reduce(growthAbsolute, 0)
          : reduce(harmony[dimension], tension[dimension]),
      );
    }
    if (
      DIMENSIONS.some((d) => d !== 'growth' && harmony[d] > 0 && tension[d] > 0)
    )
      mixedSign++;
    if (
      DIMENSIONS.some(
        (d) => d !== 'growth' && termHarmony[d] > 0 && tension[d] > 0,
      )
    )
      mixedSignTerms++;
    worstReconstruction = Math.max(
      worstReconstruction,
      Math.abs(harmonySum - result.harmony),
      Math.abs(tensionSum - result.tension),
    );

    // `compatibility()` buckets term >= 0 as harmony (an aspect exactly at
    // its maximum orb has term 0); a card is a card, so match that.
    const positives = result.aspects.filter((x) => x.term >= 0);
    const tensions = result.aspects.filter((x) => x.term < 0);
    const curated = result.aspects.filter((x) =>
      isCurated(x.planetA, x.planetB),
    );
    curatedAspectTotal += curated.length;
    if (curated.some((x) => isPair(['pluto', 'venus'], x.planetA, x.planetB)))
      plutoVenusPairs++;

    const curatedPositives = curated.filter((x) => x.term >= 0).length;
    const curatedTensions = curated.filter((x) => x.term < 0).length;
    if (curatedPositives < 3) curatedShort++;
    if (curatedTensions === 0) curatedNoTension++;
    if (curatedPositives < 3 && curatedTensions === 0) curatedBoth++;
    if (positives.length < 3) allShort++;
    if (positives.length === 0) allEmptyWhy++;
    if (positives.length > 0 && positives.length < 3 && tensions.length > 0)
      allShortOnly++;
    if (tensions.length === 0) allNoTension++;
    if (positives.length < 3 && tensions.length === 0) allBoth++;
    if (positives.length === 0 && tensions.length === 0) allBothEmpty++;
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
unrounded.sort((x, y) => x - y);
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
  `unrounded quantiles (what a displayed number would calibrate on): ` +
    `p50=${quantile(unrounded, 50).toFixed(4)} ` +
    `p95=${quantile(unrounded, 95).toFixed(4)} ` +
    `p99=${quantile(unrounded, 99).toFixed(4)}`,
);
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
console.log(`  both at once:           ${share(allBoth)} % (${allBoth})`);
console.log(
  `  of those, short but with nothing empty: ${allShortOnly} ` +
    `(the counts above are nested, not disjoint)`,
);
console.log('sections the omit branch actually empties (all 51 pairings):');
console.log(
  `  no positive at all:     ${share(allEmptyWhy)} % (${allEmptyWhy})`,
);
console.log(
  `  no tension at all:      ${share(allNoTension)} % (${allNoTension})`,
);
console.log(
  `  both empty:             ${share(allBothEmpty)} % (${allBothEmpty})`,
);

console.log(
  `a dimension carries both a harmony and a tension contribution in ` +
    `${share(mixedSign)} % of pairs (why each keeps two sums, not one ` +
    `signed sum); counting aspect terms only, ${share(mixedSignTerms)} %`,
);

/** The whole calibrated surface: three cut points plus two per dimension. */
const bands = BAND_CUTS.map((cut) => quantile(scores, cut));
console.log(
  `overall band cuts (p${BAND_CUTS.join('/p')}): ${bands.join(', ')}`,
);
// The score is a discrete integer with mass sitting exactly on the cuts, so
// the four bands cannot come out equal however the cuts are chosen.
const bandShares = [0, 1, 2, 3].map((index) => {
  const lower = index === 0 ? -Infinity : (bands[index - 1] ?? 0);
  const upper = index === 3 ? Infinity : (bands[index] ?? 0);
  return share(scores.filter((s) => s >= lower && s < upper).length);
});
console.log(`  band shares: ${bandShares.join(' / ')} %`);

const labels: Record<string, number[]> = {};
for (const dimension of DIMENSIONS) {
  const values = byDimension[dimension];
  values.sort((x, y) => x - y);
  labels[dimension] = LABEL_CUTS.map((cut) =>
    Number(quantile(values, cut).toFixed(2)),
  );
  console.log(
    `  ${dimension.padEnd(14)} median=${quantile(values, 50).toFixed(1)} ` +
      `cuts=${(labels[dimension] ?? []).join(', ')} ` +
      `terms/pair=${(termTotals[dimension] / pairs).toFixed(2)} ` +
      `absent=${share(absent[dimension])} % ` +
      `(bonus-only ${share(bonusOnly[dimension])} %)`,
  );
}

if (out !== undefined) {
  const path = resolve(out);
  writeFileSync(
    path,
    `${JSON.stringify({ charts: CHARTS, pairs, seed, bands, labels }, null, 2)}\n`,
  );
  console.log(`wrote ${path}`);
}
