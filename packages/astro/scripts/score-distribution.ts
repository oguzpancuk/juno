/**
 * Reference distribution for the compatibility score (ADR-0009).
 *
 * ADR-0003's score is not a percentage — it is a weighted aspect sum mapped
 * to 0–100, and nobody had measured where real charts land on it. This
 * generates the product's actual population (births 1991–2006, ages 20–35 in
 * 2026, Turkish coordinates), scores every pair, and reports:
 *
 *  1. the score distribution and the raw → percentile table the UI needs
 *     before it may print a number (ADR-0009 decision 3);
 *  2. how often a match page could not be filled from the curated pairings
 *     alone, which is what makes the fill rule two-step (decision 5).
 *
 * Not part of the battery: it is evidence for the ADR and the generator for
 * the committed percentile fixture.
 *
 *   npx tsx packages/astro/scripts/score-distribution.ts [percentiles.json]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compatibility, type Body } from '../src/compatibility';
import { computeChart } from '../src/chart';
import { toPublicChart, type PublicChart } from '../src/public';

/** Charts, not pairs: the pair count is n(n−1)/2. */
const CHARTS = 400;

/**
 * The pairings the owner's product system puts on the primary match view
 * (2026-09-10). Unordered: synastry visits A×B and B×A separately, and both
 * belong to the same pairing.
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

const isCurated = (a: Body, b: Body): boolean =>
  CURATED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/**
 * Deterministic LCG: the ADR quotes these numbers, so a rerun has to
 * reproduce them without committing 400 charts.
 */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function population(count: number): PublicChart[] {
  const random = makeRandom(20260910);
  const charts: PublicChart[] = [];
  const from = Date.UTC(1991, 0, 1);
  const to = Date.UTC(2006, 11, 31);
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

const charts = population(CHARTS);
const scores: number[] = [];
let curatedShort = 0; // fewer than 3 positives among the curated pairings
let curatedNoTension = 0;
let allShort = 0;
let allNoTension = 0;
let allBoth = 0;

for (let i = 0; i < charts.length; i++) {
  for (let j = i + 1; j < charts.length; j++) {
    const a = charts[i];
    const b = charts[j];
    if (!a || !b) continue;
    const result = compatibility(a, b);
    scores.push(result.score);

    const positives = result.aspects.filter((x) => x.term > 0);
    const tensions = result.aspects.filter((x) => x.term < 0);
    const curatedPositives = positives.filter((x) =>
      isCurated(x.planetA, x.planetB),
    );
    const curatedTensions = tensions.filter((x) =>
      isCurated(x.planetA, x.planetB),
    );

    if (curatedPositives.length < 3) curatedShort++;
    if (curatedTensions.length === 0) curatedNoTension++;
    if (positives.length < 3) allShort++;
    if (tensions.length === 0) allNoTension++;
    if (positives.length < 3 && tensions.length === 0) allBoth++;
  }
}

scores.sort((x, y) => x - y);
const pairs = scores.length;
const share = (n: number): string => ((n / pairs) * 100).toFixed(2);
const at = (percentile: number): number =>
  scores[Math.floor((percentile / 100) * (pairs - 1))] ?? 0;

console.log(`charts=${CHARTS} pairs=${pairs}`);
console.log(
  `score: min=${at(0)} p25=${at(25)} median=${at(50)} p75=${at(75)} ` +
    `p95=${at(95)} p99=${at(99)} max=${at(100)}`,
);
for (const threshold of [70, 80, 86]) {
  const above = scores.filter((s) => s >= threshold).length;
  console.log(`  at or above ${threshold}: ${share(above)} %`);
}
console.log('match page gaps (curated 17 pairings):');
console.log(`  fewer than 3 positives: ${share(curatedShort)} %`);
console.log(`  no tension at all:      ${share(curatedNoTension)} %`);
console.log('match page gaps (all 51 pairings):');
console.log(`  fewer than 3 positives: ${share(allShort)} %`);
console.log(`  no tension at all:      ${share(allNoTension)} %`);
console.log(`  both at once:           ${share(allBoth)} %`);

/**
 * Raw score → percentile, one entry per reachable raw score. The UI maps
 * through this before printing a number, so a displayed 86 means "ahead of
 * 86 % of pairs" rather than a share of an imagined maximum.
 */
const percentiles: Record<string, number> = {};
for (let raw = 0; raw <= 100; raw++) {
  const below = scores.filter((s) => s < raw).length;
  percentiles[String(raw)] = Math.round((below / pairs) * 100);
}

const out = process.argv[2];
if (out !== undefined) {
  const path = resolve(out);
  writeFileSync(
    path,
    `${JSON.stringify({ charts: CHARTS, pairs, percentiles }, null, 2)}\n`,
  );
  console.log(`wrote ${path}`);
}
