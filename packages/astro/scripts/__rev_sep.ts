import { aspectBetween, type Body } from '../src/compatibility';
import { signedDelta } from '../src/signs';
import { computeChart } from '../src/chart';
import { toPublicChart, type PublicChart } from '../src/public';

const BODIES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','ascendant'] as const;
const OUTER = new Set<Body>(['jupiter','saturn','uranus','neptune','pluto']);
const BODY_WEIGHT: Record<string, number> = { sun:1, moon:1, venus:0.9, mars:0.8, ascendant:0.8, jupiter:0.7, saturn:0.7, mercury:0.6, uranus:0.5, neptune:0.5, pluto:0.5 };
const ASPECTS = ['conjunction','sextile','square','trine','opposition'] as const;
const SPEC: Record<string, {angle:number;maxOrb:number;base:number}> = {
  conjunction:{angle:0,maxOrb:8,base:4}, trine:{angle:120,maxOrb:6,base:3}, sextile:{angle:60,maxOrb:4,base:2},
  opposition:{angle:180,maxOrb:8,base:-2}, square:{angle:90,maxOrb:6,base:-3},
};
const SATURN_TARGETS = new Set(['moon','venus','mars']);
const HARD = new Set(['conjunction','square','opposition']);
const r6 = (v:number)=>Number(v.toFixed(6));

function local(planetA: string, lonA: number, planetB: string, lonB: number, old: boolean) {
  const separation = old
    ? Math.abs(signedDelta(lonB - lonA))
    : Math.abs(signedDelta(Math.max(lonA, lonB) - Math.min(lonA, lonB)));
  const outer = OUTER.has(planetA as Body) || OUTER.has(planetB as Body);
  for (const aspect of ASPECTS) {
    const spec = SPEC[aspect]!;
    const orb = Math.abs(separation - spec.angle);
    const maxOrb = outer ? spec.maxOrb * 0.75 : spec.maxOrb;
    if (orb > maxOrb) continue;
    const saturnHard = HARD.has(aspect) && ((planetA==='saturn'&&SATURN_TARGETS.has(planetB))||(planetB==='saturn'&&SATURN_TARGETS.has(planetA)));
    const descendant = aspect==='opposition' && (planetA==='ascendant'||planetB==='ascendant');
    const base = saturnHard ? -4 : descendant ? 4 : spec.base;
    let factor = 1 - orb/maxOrb;
    if (orb <= 2) factor = Math.min(1, factor*1.25);
    const term = BODY_WEIGHT[planetA]! * BODY_WEIGHT[planetB]! * base * factor;
    return { planetA, aspect, planetB, orb: Number(orb.toFixed(4)), term: r6(term) };
  }
  return null;
}

function makeRandom(seed:number){let s=seed;return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};}
function population(count:number,seed:number):PublicChart[]{
  const random=makeRandom(seed); const out:PublicChart[]=[];
  const from=Date.UTC(1991,0,1), to=Date.UTC(2006,0,1);
  for(let i=0;i<count;i++) out.push(toPublicChart(computeChart({utc:new Date(from+random()*(to-from)),latitude:36+random()*6,longitude:26+random()*19})));
  return out;
}
const lonOf=(c:PublicChart,b:string)=> b==='ascendant'? c.houses.ascendant : (c.planets as any)[b].longitude;

const N = Number(process.argv[2] ?? 1500);
const charts = population(N, 20260910);
let validateFail=0, presenceDiff=0, orbDiff=0, termDiff=0, sepDiff=0, cmp=0;
const examples:string[]=[];
for(let i=0;i<charts.length;i++) for(let j=i+1;j<charts.length;j++){
  const A=charts[i]!,B=charts[j]!;
  for(const pa of BODIES) for(const pb of BODIES){
    if(OUTER.has(pa)&&OUTER.has(pb)) continue;
    const lonA=lonOf(A,pa), lonB=lonOf(B,pb);
    cmp++;
    const ref = aspectBetween(pa,lonA,pb,lonB);
    const mineNew = local(pa,lonA,pb,lonB,false);
    if(JSON.stringify(ref)!==JSON.stringify(mineNew)) validateFail++;
    const mineOld = local(pa,lonA,pb,lonB,true);
    const so=Math.abs(signedDelta(lonB-lonA)), sn=Math.abs(signedDelta(Math.max(lonA,lonB)-Math.min(lonA,lonB)));
    if(so!==sn) sepDiff++;
    if((mineOld===null)!==(mineNew===null)){ presenceDiff++; if(examples.length<5) examples.push(`presence ${pa}/${pb} old=${JSON.stringify(mineOld)} new=${JSON.stringify(mineNew)}`); continue; }
    if(mineOld&&mineNew){
      if(mineOld.aspect!==mineNew.aspect){ presenceDiff++; if(examples.length<5) examples.push(`aspect ${pa}/${pb} ${mineOld.aspect} vs ${mineNew.aspect}`); }
      if(mineOld.orb!==mineNew.orb){ orbDiff++; if(examples.length<8) examples.push(`orb ${pa}/${pb} ${mineOld.orb} vs ${mineNew.orb}`); }
      if(mineOld.term!==mineNew.term){ termDiff++; if(examples.length<8) examples.push(`term ${pa}/${pb} ${mineOld.term} vs ${mineNew.term}`); }
    }
  }
}
console.log(JSON.stringify({charts:N,comparisons:cmp,validateFail,sepDiff,presenceDiff,orbDiff,termDiff}));
console.log(examples.join('\n'));
