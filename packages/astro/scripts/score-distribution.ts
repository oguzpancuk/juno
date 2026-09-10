/**
 * Reference distribution for the compatibility score (ADR-0009).
 *
 * ADR-0003 maps a weighted aspect sum to 0-100, and nobody had measured
 * where real charts land on it. This generates the product's own population
 * (births 1991-2005, ages 20-35 in 2026, Turkish coordinates), scores every
 * pair, and reports:
 *
 *  1. the quantile breakpoints the UI maps through before it may print a
 *     number, so a shown 86 means "ahead of 86 % of pairs" (ADR-0009 §3);
 *  2. how often a match page could not be filled from the curated pairings
 *     alone, which is what makes the fill rule two-step (§5);
 *  3. the aspect counts and the Pluto-Venus share the ADR quotes, so every
 *     figure in it can be refreshed from one run.
 *
 * Calibration uses the UNROUNDED score. `compatibility()` returns an integer,
 * and integers are too coarse to calibrate against: consecutive raw values
 * are whole percentiles apart near the median, so most displayable numbers
 * would be unreachable and the top few raw values would all read as 100.
 *
 * Not part of the battery: it is the evidence for the ADR and the generator
 * for the committed fixture.
 *
 *   npx tsx packages/astro/scripts/score-distribution.ts [out.json] [seed]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compatibility, type Body } from '../src/compatibility';
import { computeChart } from '../src/chart';
import { toPublicChart, type PublicChart } from '../src/public';

/** Charts, not pairs: the pair count is n(n-1)/2. */
const CHARTS = 1500;
const DEFAULT_SEED = 20260910;

/**
 * The pairings the owner's product system puts on the primary match view
 * (2026-09-10). Unordered: synastry visits A x B and B x A separately, and
 * both are genuine aspects belonging to the same pairing.
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

/** ADR-0003's mapping, before the rounding `compatibility()` applies. */
function continuousScore(harmony: number, tension: number): number {
  const raw = 50 + (50 * (harmony - tension)) / (harmony + tension + 10);
  return Math.min(100, Math.max(0, raw));
}

const seedArg = process.argv[3];
const seed = seedArg === undefined ? DEFAULT_SEED : Number(seedArg);
const charts = population(CHARTS, seed);

const rounded: number[] = [];
const continuous: number[] = [];
let aspectTotal = 0;
let curatedAspectTotal = 0;
let plutoVenusPairs = 0;
let curatedShort = 0;
let curatedNoTension = 0;
let curatedBoth = 0;
let allShort = 0;
let allNoTension = 0;
let allBoth = 0;

for (let i = 0; i < charts.length; i++) {
  for (let j = i + 1; j < charts.length; j++) {
    const a = charts[i];
    const b = charts[j];
    if (!a || !b) throw new Error(`missing chart at ${i} or ${j}`);
    const result = compatibility(a, b);
    rounded.push(result.score);
    continuous.push(continuousScore(result.harmony, result.tension));

    aspectTotal += result.aspects.length;
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

const pairs = rounded.length;
const expected = (CHARTS * (CHARTS - 1)) / 2;
if (pairs !== expected)
  throw new Error(`scored ${pairs} pairs, expected ${expected}`);

rounded.sort((x, y) => x - y);
continuous.sort((x, y) => x - y);
const share = (n: number): string => ((n / pairs) * 100).toFixed(2);
const quantile = (values: number[], percentile: number): number =>
  values[Math.min(pairs - 1, Math.floor((percentile / 100) * pairs))] ?? 0;

console.log(`charts=${CHARTS} pairs=${pairs} seed=${seed}`);
console.log(
  `score (as returned, rounded): min=${quantile(rounded, 0)} ` +
    `p25=${quantile(rounded, 25)} median=${quantile(rounded, 50)} ` +
    `p75=${quantile(rounded, 75)} p95=${quantile(rounded, 95)} ` +
    `p99=${quantile(rounded, 99)} max=${rounded[pairs - 1] ?? 0}`,
);
for (const threshold of [70, 80, 86]) {
  console.log(
    `  at or above ${threshold}: ${share(rounded.filter((s) => s >= threshold).length)} %`,
  );
}
console.log(
  `aspects per pair: ${(aspectTotal / pairs).toFixed(2)} over all 51 pairings, ` +
    `${(curatedAspectTotal / pairs).toFixed(2)} over the curated 17`,
);
console.log(`Pluto-Venus present in ${share(plutoVenusPairs)} % of pairs`);
console.log('match page gaps (curated 17 pairings):');
console.log(`  fewer than 3 positives: ${share(curatedShort)} %`);
console.log(`  no tension at all:      ${share(curatedNoTension)} %`);
console.log(`  both at once:           ${share(curatedBoth)} %`);
console.log('match page gaps (all 51 pairings):');
console.log(`  fewer than 3 positives: ${share(allShort)} %`);
console.log(`  no tension at all:      ${share(allNoTension)} %`);
console.log(`  both at once:           ${share(allBoth)} %`);

/**
 * The fixture: `breakpoints[k]` is the continuous score at percentile k.
 * The UI finds the largest k whose breakpoint is at or below a pair's
 * continuous score, so a displayed number is a rank among pairs. Monotonic
 * by construction, since it is read off a sorted sample.
 */
const breakpoints: number[] = [];
for (let k = 0; k <= 100; k++) {
  breakpoints.push(Number(quantile(continuous, k).toFixed(4)));
}
console.log(
  `breakpoints: p1=${breakpoints[1] ?? 0} p50=${breakpoints[50] ?? 0} ` +
    `p86=${breakpoints[86] ?? 0} p99=${breakpoints[99] ?? 0} ` +
    `(distinct: ${new Set(breakpoints).size}/101)`,
);

const out = process.argv[2];
if (out !== undefined) {
  const path = resolve(out);
  writeFileSync(
    path,
    `${JSON.stringify({ charts: CHARTS, pairs, seed, breakpoints }, null, 2)}\n`,
  );
  console.log(`wrote ${path}`);
}
