/**
 * Content audit (not part of the battery — judgment aids for a review):
 *  1. Sentiment direction: every aspect text should read in the direction
 *     the ADR scores it (harmonious vs tense), detected with a small Turkish
 *     marker lexicon. Prints mismatches for a human to judge.
 *  2. Coherence report: for sample chart pairs, prints each person's natal
 *     reading (big three + key placements) next to the synastry reading, so
 *     a reviewer can judge whether the geometric match and the written
 *     characters agree.
 *
 *   npx tsx packages/astro/scripts/content-audit.ts [report-path]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeChart } from '../src/chart';
import { aspectBetween, type Aspect, type Body } from '../src/compatibility';
import { CONTENT_FILES, KEY_SPACES, synastryText } from '../src/content';
import { toPublicChart, type PublicChart } from '../src/public';
import { natalReading, synastryReading } from '../src/summary';
import { BODY_TR, SIGN_TR } from '../src/tr';
import { resolveBirth } from '../../geo/src/index';

const TENSE = [
  'gerilim',
  'çatış',
  'sürtüş',
  'zorl',
  'risk',
  'sınav',
  'kısıtl',
  'mesafe',
  'soğuk',
  'öfke',
  'mücadele',
  'kıskan',
  'yanılsama',
  'hayal kırıklığı',
  'kaçış',
  'takınt',
  'kontrol',
  'engel',
  'çekiş',
  'karşı karşıya',
  'uyuşmaz',
  'çeliş',
  'ağır',
  'yük',
  'sabırsız',
  'abart',
  'belirsiz',
  'karşı kutup',
  'zıt',
  'gerilir',
  'sınan',
  'farklı',
  'fark ',
  'yanlış',
  'huzursuz',
  'kopuş',
  'karamsar',
  'bulanık',
  'kaybetme',
  'dikkatsiz',
  'hırs',
  'gecikme',
  'idealize',
  'ters',
  'zorunda',
  'gerek',
  'tersini',
  'savaş',
  'isyan',
  'yalnızlık',
  'yetersiz',
  'dalgalan',
];
const HARMONIOUS = [
  'destekler',
  'kolay',
  'uyumlu',
  'doğal',
  'rahat',
  'zahmetsiz',
  'besler',
  'akar',
  'güven',
  'sağlam',
];

function natureOf(
  a: Body,
  aspect: Aspect,
  b: Body,
): 'harmony' | 'tension' | 'blend' {
  const hit = aspectBetween(
    a,
    0,
    b,
    { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }[
      aspect
    ],
  );
  if (!hit) return 'blend';
  if (aspect === 'conjunction' && hit.term > 0) return 'blend';
  return hit.term >= 0 ? 'harmony' : 'tension';
}

const lines: string[] = [
  '# Content audit',
  '',
  '## 1. Sentiment direction vs ADR-0003 score',
  '',
];
let flagged = 0;
for (const [file, keys] of [
  ['natalAspects', KEY_SPACES.natalAspects()],
  ['synastry', KEY_SPACES.synastry()],
] as const) {
  const map = CONTENT_FILES[file];
  for (const key of keys) {
    const [a, aspect, b] = key.split('-') as [Body, Aspect, Body];
    const text = (map[key] ?? '').toLowerCase();
    const nature = natureOf(a, aspect, b);
    const tense = TENSE.filter((m) => text.includes(m));
    const nice = HARMONIOUS.filter((m) => text.includes(m));
    if (nature === 'tension' && tense.length === 0) {
      lines.push(
        `- TENSE-BUT-SOFT ${file} ${key}: no tension marker — "${map[key] ?? ''}"`,
      );
      flagged++;
    } else if (nature === 'harmony' && tense.length >= 2 && nice.length === 0) {
      lines.push(
        `- HARMONY-BUT-DARK ${file} ${key}: ${tense.join(',')} — "${map[key] ?? ''}"`,
      );
      flagged++;
    }
  }
}
lines.push(
  '',
  `Flagged: ${flagged}`,
  '',
  '## 2. Coherence report: natal characters vs synastry',
  '',
);

interface Person {
  name: string;
  chart: PublicChart;
}
const seeds: {
  name: string;
  cityId: number;
  local: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
}[] = [
  {
    name: 'Ayse (fixture #1)',
    cityId: 745044,
    local: { year: 1995, month: 7, day: 14, hour: 3, minute: 30 },
  },
  {
    name: 'Deniz',
    cityId: 745044,
    local: { year: 1993, month: 3, day: 21, hour: 8, minute: 15 },
  },
  {
    name: 'Emre',
    cityId: 745044,
    local: { year: 1996, month: 11, day: 2, hour: 14, minute: 40 },
  },
  {
    name: 'Selin',
    cityId: 745044,
    local: { year: 1994, month: 5, day: 9, hour: 22, minute: 5 },
  },
  {
    name: 'Zeynep',
    cityId: 745044,
    local: { year: 1998, month: 8, day: 30, hour: 5, minute: 50 },
  },
  {
    name: 'Kaan',
    cityId: 745044,
    local: { year: 1991, month: 1, day: 17, hour: 11, minute: 25 },
  },
  {
    name: 'Burak',
    cityId: 323786,
    local: { year: 1995, month: 12, day: 25, hour: 9, minute: 0 },
  },
];
const people: Person[] = seeds.map((s) => {
  const b = resolveBirth({ cityId: s.cityId, local: s.local });
  return {
    name: s.name,
    chart: toPublicChart(
      computeChart({
        utc: b.utc,
        latitude: b.latitude,
        longitude: b.longitude,
      }),
    ),
  };
});

function natalBrief(p: Person): string[] {
  const r = natalReading(p.chart, 3);
  const c = p.chart;
  const pick = (body: 'sun' | 'moon' | 'venus' | 'mars') => {
    const pr = r.planets.find((x) => x.planet === body);
    return `  - ${BODY_TR[body]} ${SIGN_TR[c.planets[body].sign]} (${c.planets[body].house}. ev): ${pr?.signText ?? ''} ${pr?.houseText ?? ''}`;
  };
  return [
    `### ${p.name} — Güneş ${SIGN_TR[c.planets.sun.sign]}, Ay ${SIGN_TR[c.planets.moon.sign]}, Yükselen ${SIGN_TR[r.risingText ? ((['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] as const)[Math.floor(c.houses.ascendant / 30)] ?? 'aries') : 'aries']}`,
    `  - Yükselen: ${r.risingText}`,
    pick('sun'),
    pick('moon'),
    pick('venus'),
    pick('mars'),
    `  - Doğum açıları: ${r.aspects.map((a) => `${BODY_TR[a.aspect.planetA]} ${a.aspect.aspect} ${BODY_TR[a.aspect.planetB]} → ${a.text}`).join(' | ')}`,
  ];
}

const pairs: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 5],
  [3, 1],
  [4, 2],
  [3, 6],
  [0, 3],
];
for (const [i, j] of pairs) {
  const A = people[i];
  const B = people[j];
  if (!A || !B) throw new Error(`pair ${i},${j} out of range`);
  const s = synastryReading(A.chart, B.chart, 5);
  lines.push(
    `## ${A.name} × ${B.name} — skor ${s.score} (${s.band})`,
    '',
    ...natalBrief(A),
    '',
    ...natalBrief(B),
    '',
    `**Uyum bandı:** ${s.bandText}`,
    `**Elementler:** ${s.sunElements} / ${s.moonElements}`,
    '**Öne çıkan açılar:**',
  );
  for (const a of s.aspects)
    lines.push(
      `- (${a.aspect.term > 0 ? '+' : ''}${a.aspect.term.toFixed(2)}) ${a.headline} ${a.meaning} → _${a.question}_`,
    );
  lines.push(
    `- Toplam açı: ${s.match.aspects.length}, H=${s.match.harmony}, T=${s.match.tension}`,
    '',
  );
}
// sanity: every synastry key resolves
for (const key of KEY_SPACES.synastry()) {
  const [a, asp, b] = key.split('-') as [Body, Aspect, Body];
  synastryText(a, asp, b);
}
const out = resolve(process.argv[2] ?? 'content-audit.md');
writeFileSync(out, lines.join('\n') + '\n');
console.log(`wrote ${out} (${flagged} sentiment flags)`);
