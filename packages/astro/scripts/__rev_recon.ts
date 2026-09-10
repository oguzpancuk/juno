import { compatibility, type ChartForScoring } from '../src/compatibility';
import { DIMENSIONS } from '../src/dimensions';
import { computeChart } from '../src/chart';
import { toPublicChart } from '../src/public';

function population(count: number, seed: number): ChartForScoring[] {
  let state = seed;
  const random = (): number => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const from = Date.UTC(1970, 0, 1);
  const to = Date.UTC(2008, 0, 1);
  const charts: ChartForScoring[] = [];
  for (let i = 0; i < count; i++) {
    charts.push(
      toPublicChart(
        computeChart({
          utc: new Date(from + random() * (to - from)),
          latitude: -50 + random() * 110,
          longitude: -180 + random() * 360,
        }),
      ),
    );
  }
  return charts;
}

const round6 = (v: number) => Number(v.toFixed(6));
const N = Number(process.argv[2] ?? 60);
const seed = Number(process.argv[3] ?? 12345);
const charts = population(N, seed);
let pairs = 0, hFail = 0, tFail = 0, maxHDiff = 0, maxTDiff = 0;
let asymDim = 0, asymScore = 0, asymHT = 0, asymStrongest = 0, asymAspectsLen = 0, asymAspectMultiset = 0;
let strongestExamples: string[] = [];
for (let i = 0; i < charts.length; i++) {
  for (let j = i + 1; j < charts.length; j++) {
    const a = charts[i]!, b = charts[j]!;
    const r = compatibility(a, b);
    pairs++;
    let h = 0, t = 0;
    for (const d of DIMENSIONS) { h += r.dimensions[d].harmony; t += r.dimensions[d].tension; }
    if (round6(h) !== r.harmony) { hFail++; maxHDiff = Math.max(maxHDiff, Math.abs(h - r.harmony)); }
    if (round6(t) !== r.tension) { tFail++; maxTDiff = Math.max(maxTDiff, Math.abs(t - r.tension)); }
    const back = compatibility(b, a);
    if (back.score !== r.score) asymScore++;
    if (back.harmony !== r.harmony || back.tension !== r.tension) asymHT++;
    if (JSON.stringify(back.dimensions) !== JSON.stringify(r.dimensions)) asymDim++;
    if (back.aspects.length !== r.aspects.length) asymAspectsLen++;
    // mirrored multiset of aspects
    const key = (x: any) => `${x.planetA}|${x.aspect}|${x.planetB}|${x.orb}|${x.term}`;
    const mkey = (x: any) => `${x.planetB}|${x.aspect}|${x.planetA}|${x.orb}|${x.term}`;
    const f = r.aspects.map(key).sort().join(',');
    const bk = back.aspects.map(mkey).sort().join(',');
    if (f !== bk) asymAspectMultiset++;
    const s = r.strongest, sb = back.strongest;
    if (s === null || sb === null) { if (s !== sb) asymStrongest++; }
    else if (!(s.planetA === sb.planetB && s.planetB === sb.planetA && s.aspect === sb.aspect && s.term === sb.term && s.orb === sb.orb)) {
      asymStrongest++;
      if (strongestExamples.length < 5) strongestExamples.push(`${i},${j}: fwd ${key(s)} vs bwd ${key(sb)}`);
    }
  }
}
console.log(JSON.stringify({ charts: N, pairs, hFail, tFail, maxHDiff, maxTDiff, asymScore, asymHT, asymDim, asymAspectsLen, asymAspectMultiset, asymStrongest }, null, 1));
console.log(strongestExamples.join('\n'));
