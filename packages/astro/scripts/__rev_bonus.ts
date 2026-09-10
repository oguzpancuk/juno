import { compatibility, elementsAgree, type ChartForScoring } from '../src/compatibility';
import { DIMENSIONS, dimensionOf, type Dimension } from '../src/dimensions';
import { computeChart } from '../src/chart';
import { toPublicChart } from '../src/public';
function population(count: number, seed: number): ChartForScoring[] {
  let state = seed;
  const random = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
  const from = Date.UTC(1970, 0, 1), to = Date.UTC(2008, 0, 1);
  const out: ChartForScoring[] = [];
  for (let i = 0; i < count; i++) out.push(toPublicChart(computeChart({ utc: new Date(from + random() * (to - from)), latitude: -50 + random() * 110, longitude: -180 + random() * 360 })));
  return out;
}
const r6 = (v: number) => Number(v.toFixed(6));
const charts = population(Number(process.argv[2] ?? 60), Number(process.argv[3] ?? 5));
let bad = 0, checked = 0, sunAgree = 0, moonAgree = 0, stabZeroTermsWithBonus = 0, emoZeroTermsWithBonus = 0;
for (let i = 0; i < charts.length; i++) for (let j = i + 1; j < charts.length; j++) {
  const a = charts[i]!, b = charts[j]!;
  const r = compatibility(a, b); checked++;
  const exp: Record<Dimension, {h:number;t:number;n:number;abs:number}> = { emotional:{h:0,t:0,n:0,abs:0}, chemistry:{h:0,t:0,n:0,abs:0}, communication:{h:0,t:0,n:0,abs:0}, stability:{h:0,t:0,n:0,abs:0}, growth:{h:0,t:0,n:0,abs:0} };
  for (const asp of r.aspects) {
    const d = dimensionOf(asp.planetA, asp.planetB)!;
    if (asp.term >= 0) exp[d].h += asp.term; else exp[d].t += -asp.term;
    exp[d].abs += Math.abs(asp.term); exp[d].n++;
  }
  const sa = elementsAgree(a.planets.sun.sign, b.planets.sun.sign);
  const ma = elementsAgree(a.planets.moon.sign, b.planets.moon.sign);
  if (sa) { exp.stability.h += 2; sunAgree++; }
  if (ma) { exp.emotional.h += 2; moonAgree++; }
  if (sa && r.dimensions.stability.terms === 0) stabZeroTermsWithBonus++;
  if (ma && r.dimensions.emotional.terms === 0) emoZeroTermsWithBonus++;
  for (const d of DIMENSIONS) {
    const g = r.dimensions[d];
    if (Math.abs(g.harmony - exp[d].h) > 1e-6 || Math.abs(g.tension - exp[d].t) > 1e-6 || Math.abs(g.absolute - exp[d].abs) > 1e-6 || g.terms !== exp[d].n) {
      if (bad < 3) console.log('MISMATCH', d, JSON.stringify(g), JSON.stringify(exp[d]));
      bad++;
    }
  }
}
console.log(JSON.stringify({ checked, bad, sunAgree, moonAgree, stabZeroTermsWithBonus, emoZeroTermsWithBonus }));
