import { PLANETS } from './bodies';
import type { PublicChart } from './public';
import { signedDelta, type Sign } from './signs';

/**
 * Synastry score per docs/adr/0003-compatibility.md. Every number here is
 * the ADR's table; change the ADR first. Pure and symmetric.
 */
export const BODIES = [...PLANETS, 'ascendant'] as const;
export type Body = (typeof BODIES)[number];

export const ASPECTS = [
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
] as const;
export type Aspect = (typeof ASPECTS)[number];

const BODY_WEIGHT: Readonly<Record<Body, number>> = {
  sun: 1,
  moon: 1,
  venus: 0.9,
  mars: 0.8,
  ascendant: 0.8,
  jupiter: 0.7,
  saturn: 0.7,
  mercury: 0.6,
  uranus: 0.5,
  neptune: 0.5,
  pluto: 0.5,
};

/** Social and generational bodies: pairs among these are never scored or emitted. */
export const OUTER_BODIES: ReadonlySet<Body> = new Set([
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]);
const OUTER_ORB_FACTOR = 0.75;

interface AspectSpec {
  readonly angle: number;
  readonly maxOrb: number;
  readonly base: number;
}

const ASPECT_SPEC: Readonly<Record<Aspect, AspectSpec>> = {
  conjunction: { angle: 0, maxOrb: 8, base: 4 },
  trine: { angle: 120, maxOrb: 6, base: 3 },
  sextile: { angle: 60, maxOrb: 4, base: 2 },
  opposition: { angle: 180, maxOrb: 8, base: -2 },
  square: { angle: 90, maxOrb: 6, base: -3 },
};

/** Saturn hard aspects to the other chart's Moon, Venus or Mars. */
const SATURN_HARD_BASE = -4;
const SATURN_TARGETS: ReadonlySet<Body> = new Set(['moon', 'venus', 'mars']);
const HARD: ReadonlySet<Aspect> = new Set([
  'conjunction',
  'square',
  'opposition',
]);

const TIGHT_ORB = 2;
const TIGHT_BONUS = 1.25;
const ELEMENT_BONUS = 2;
const DAMPING = 10;

export interface InterAspect {
  /** Body in chart A. */
  readonly planetA: Body;
  readonly aspect: Aspect;
  /** Body in chart B. */
  readonly planetB: Body;
  /** Distance from exact, degrees. */
  readonly orb: number;
  /** Signed contribution: positive = harmony, negative = tension. */
  readonly term: number;
}

export interface Compatibility {
  /** 0–100. */
  readonly score: number;
  readonly harmony: number;
  readonly tension: number;
  readonly aspects: readonly InterAspect[];
  /** Largest |term|, harmonious preferred within 10 %; null when no aspects. */
  readonly strongest: InterAspect | null;
}

/** Charts as stored/shared: placements plus the Ascendant. */
export type ChartForScoring = Pick<PublicChart, 'planets'> & {
  readonly houses: { readonly ascendant: number };
};

function longitudeOf(chart: ChartForScoring, body: Body): number {
  return body === 'ascendant'
    ? chart.houses.ascendant
    : chart.planets[body].longitude;
}

const ELEMENT: Readonly<Record<Sign, 'fire' | 'earth' | 'air' | 'water'>> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

const COMPLEMENT = {
  fire: 'air',
  air: 'fire',
  earth: 'water',
  water: 'earth',
} as const;

export function elementsAgree(a: Sign, b: Sign): boolean {
  const ea = ELEMENT[a];
  const eb = ELEMENT[b];
  return ea === eb || COMPLEMENT[ea] === eb;
}

function roundTerm(value: number): number {
  return Number(value.toFixed(6));
}

/** One inter-chart aspect for a body pair, or null when out of orb. */
export function aspectBetween(
  planetA: Body,
  lonA: number,
  planetB: Body,
  lonB: number,
): InterAspect | null {
  const separation = Math.abs(signedDelta(lonB - lonA));
  const outer = OUTER_BODIES.has(planetA) || OUTER_BODIES.has(planetB);
  for (const aspect of ASPECTS) {
    const spec = ASPECT_SPEC[aspect];
    const orb = Math.abs(separation - spec.angle);
    const maxOrb = outer ? spec.maxOrb * OUTER_ORB_FACTOR : spec.maxOrb;
    if (orb > maxOrb) continue;
    const saturnHard =
      HARD.has(aspect) &&
      ((planetA === 'saturn' && SATURN_TARGETS.has(planetB)) ||
        (planetB === 'saturn' && SATURN_TARGETS.has(planetA)));
    // Opposition to the Ascendant is a conjunction to the Descendant, the
    // partnership point: scored like a conjunction (ADR-0003 amendment 1).
    const descendant =
      aspect === 'opposition' &&
      (planetA === 'ascendant' || planetB === 'ascendant');
    const base = saturnHard
      ? SATURN_HARD_BASE
      : descendant
        ? ASPECT_SPEC.conjunction.base
        : spec.base;
    let factor = 1 - orb / maxOrb;
    if (orb <= TIGHT_ORB) factor = Math.min(1, factor * TIGHT_BONUS);
    const term = BODY_WEIGHT[planetA] * BODY_WEIGHT[planetB] * base * factor;
    return {
      planetA,
      aspect,
      planetB,
      orb: Number(orb.toFixed(4)),
      term: roundTerm(term),
    };
  }
  return null;
}

/** ADR-0003 score from harmony and tension sums. */
export function scoreFrom(harmony: number, tension: number): number {
  const raw = 50 + (50 * (harmony - tension)) / (harmony + tension + DAMPING);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function compatibility(
  chartA: ChartForScoring,
  chartB: ChartForScoring,
): Compatibility {
  const aspects: InterAspect[] = [];
  for (const planetA of BODIES) {
    for (const planetB of BODIES) {
      if (OUTER_BODIES.has(planetA) && OUTER_BODIES.has(planetB)) continue; // generational pairs
      const found = aspectBetween(
        planetA,
        longitudeOf(chartA, planetA),
        planetB,
        longitudeOf(chartB, planetB),
      );
      if (found) aspects.push(found);
    }
  }
  let harmony = 0;
  let tension = 0;
  for (const a of aspects) {
    if (a.term >= 0) harmony += a.term;
    else tension -= a.term;
  }
  // Stored `sign` is the contract for both luminaries (toPublicChart derives
  // it from the rounded longitude, so the two cannot disagree).
  if (elementsAgree(chartA.planets.sun.sign, chartB.planets.sun.sign))
    harmony += ELEMENT_BONUS;
  if (elementsAgree(chartA.planets.moon.sign, chartB.planets.moon.sign))
    harmony += ELEMENT_BONUS;

  return {
    score: scoreFrom(harmony, tension),
    harmony: roundTerm(harmony),
    tension: roundTerm(tension),
    aspects,
    strongest: strongestOf(aspects),
  };
}

export function strongestOf(
  aspects: readonly InterAspect[],
): InterAspect | null {
  if (aspects.length === 0) return null;
  // Ties: |term| desc, then smaller orb, then the alphabetical (planetA,
  // planetB, aspect) triple, so the winner depends only on the aspect set,
  // never on array order. On an exact tie between mirrored pairs
  // (a.moon–b.venus vs a.venus–b.moon) strongest(b, a) is therefore not the
  // mirror of strongest(a, b); harmless because starterKey is always
  // computed in a < b uuid order.
  const tripleKey = (a: InterAspect) => `${a.planetA}-${a.planetB}-${a.aspect}`;
  const byMagnitude = [...aspects].sort(
    (x, y) =>
      Math.abs(y.term) - Math.abs(x.term) ||
      x.orb - y.orb ||
      tripleKey(x).localeCompare(tripleKey(y)),
  );
  const top = byMagnitude[0];
  if (!top) return null;
  if (top.term >= 0) return top;
  // Prefer a harmonious aspect within 10 % of the strongest tense one.
  const harmonious = byMagnitude.find((a) => a.term > 0);
  if (harmonious && Math.abs(harmonious.term) >= 0.9 * Math.abs(top.term))
    return harmonious;
  return top;
}

/**
 * Conversation-starter key for the `likes.starter_key` column:
 * "<body of a>-<aspect>-<body of b>" where `a` is the lesser user id.
 * Null when the pair shares no aspect (the caller must not send a like
 * without a key; PRD-5 needs a starter).
 */
export function starterKey(
  chartOfA: ChartForScoring,
  chartOfB: ChartForScoring,
): string | null {
  const strongest = compatibility(chartOfA, chartOfB).strongest;
  return strongest
    ? `${strongest.planetA}-${strongest.aspect}-${strongest.planetB}`
    : null;
}

const STARTER_KEY_RE = new RegExp(
  `^(${BODIES.join('|')})-(${ASPECTS.join('|')})-(${BODIES.join('|')})$`,
);

export function parseStarterKey(
  key: string,
): { planetA: Body; aspect: Aspect; planetB: Body } | null {
  const m = STARTER_KEY_RE.exec(key);
  if (!m) return null;
  return {
    planetA: m[1] as Body,
    aspect: m[2] as Aspect,
    planetB: m[3] as Body,
  }; // why: the regex alternation only admits members of BODIES/ASPECTS
}

/**
 * Which of two user ids is `a` in the matches table (Postgres orders uuids
 * bytewise, which equals string order on canonical lowercase hex).
 */
export function isLesserId(x: string, y: string): boolean {
  return x.toLowerCase() < y.toLowerCase();
}

/**
 * Aspects inside one chart (natal), same table and orbs as synastry;
 * generational outer–outer pairs are skipped for the same reason.
 * Ordered by |term| desc so the UI can show the strongest first.
 */
export function natalAspects(chart: ChartForScoring): InterAspect[] {
  const found: InterAspect[] = [];
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i + 1; j < BODIES.length; j++) {
      const a = BODIES[i] ?? 'sun';
      const b = BODIES[j] ?? 'sun';
      if (OUTER_BODIES.has(a) && OUTER_BODIES.has(b)) continue;
      const hit = aspectBetween(
        a,
        longitudeOf(chart, a),
        b,
        longitudeOf(chart, b),
      );
      if (hit) found.push(hit);
    }
  }
  return found.sort(
    (x, y) => Math.abs(y.term) - Math.abs(x.term) || x.orb - y.orb,
  );
}

export function elementOf(sign: Sign): 'fire' | 'earth' | 'air' | 'water' {
  return ELEMENT[sign];
}
