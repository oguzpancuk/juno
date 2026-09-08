import { z } from 'zod';
import { PLANETS, type Planet } from './bodies';
import { ASPECTS, BODIES, type Aspect, type Body } from './compatibility';

const OUTER_BODIES: ReadonlySet<Body> = new Set([
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]);
const emitted = (a: Body, b: Body): boolean =>
  !(OUTER_BODIES.has(a) && OUTER_BODIES.has(b));
/**
 * Geometrically impossible in a real chart: Mercury stays within 28° of the
 * Sun, Venus within 48°, and Mercury–Venus within 76°, so only conjunction
 * and sextile can form between them. Such keys are neither emitted nor
 * required in content.
 */
const IMPOSSIBLE = new Set<string>([
  ...['square', 'trine', 'opposition'].flatMap((asp) => [
    `sun-${asp}-mercury`,
    `sun-${asp}-venus`,
    `mercury-${asp}-venus`,
  ]),
]);
import { SIGNS, type Sign } from './signs';
import type { HouseNumber } from './houses';
import bandsRaw from '../content/tr/bands.json';
import elementsRaw from '../content/tr/elements.json';
import housesRaw from '../content/tr/houses.json';
import natalAspectsRaw from '../content/tr/natal-aspects.json';
import retrogradeRaw from '../content/tr/retrograde.json';
import signsRaw from '../content/tr/signs.json';
import synastryRaw from '../content/tr/synastry.json';

/**
 * Turkish interpretation texts. Every key the engine can emit must have a
 * non-empty entry; `content.test.ts` enumerates the key spaces below and
 * fails when one is missing, so a content gap can never reach a screen.
 * Texts are data, not astrology logic: the engine decides which keys apply.
 */
const Snippet = z.string().trim().min(20).max(320);
const SnippetMap = z.record(z.string(), Snippet);
const SynastryEntry = z.object({
  meaning: Snippet,
  question: z.string().trim().min(10).max(200).endsWith('?'),
});

export const RETRO_PLANETS = [
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;
export type RetroPlanet = (typeof RETRO_PLANETS)[number];

export const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
export type Element = (typeof ELEMENTS)[number];

export const BANDS = ['very-low', 'low', 'mid', 'high', 'very-high'] as const;
export type Band = (typeof BANDS)[number];

const signs = SnippetMap.parse(signsRaw);
const houses = SnippetMap.parse(housesRaw);
const retrograde = SnippetMap.parse(retrogradeRaw);
const natalAspects = SnippetMap.parse(natalAspectsRaw);
const synastry = z.record(z.string(), SynastryEntry).parse(synastryRaw);
const elements = SnippetMap.parse(elementsRaw);
const bands = SnippetMap.parse(bandsRaw);

const bodyIndex = (b: Body): number => BODIES.indexOf(b);

/** Canonical (lower BODIES index first) key for a body pair + aspect. */
export function pairKey(a: Body, aspect: Aspect, b: Body): string {
  const [x, y] = bodyIndex(a) <= bodyIndex(b) ? [a, b] : [b, a];
  return `${x}-${aspect}-${y}`;
}

export const signKey = (body: Planet | 'ascendant', sign: Sign): string =>
  `${body}-${sign}`;
export const houseKey = (planet: Planet, house: HouseNumber): string =>
  `${planet}-${house}`;
export const elementKey = (
  luminary: 'sun' | 'moon',
  a: Element,
  b: Element,
): string => {
  const [x, y] = ELEMENTS.indexOf(a) <= ELEMENTS.indexOf(b) ? [a, b] : [b, a];
  return `${luminary}:${x}-${y}`;
};

function must(map: Record<string, string>, key: string, file: string): string {
  const text = map[key];
  if (text === undefined)
    throw new Error(`content/tr/${file}: missing "${key}"`);
  return text;
}

export function signText(body: Planet | 'ascendant', sign: Sign): string {
  return must(signs, signKey(body, sign), 'signs.json');
}

export function houseText(planet: Planet, house: HouseNumber): string {
  return must(houses, houseKey(planet, house), 'houses.json');
}

export function retrogradeText(planet: RetroPlanet): string {
  return must(retrograde, planet, 'retrograde.json');
}

export function natalAspectText(a: Body, aspect: Aspect, b: Body): string {
  return must(natalAspects, pairKey(a, aspect, b), 'natal-aspects.json');
}

export function synastryText(
  a: Body,
  aspect: Aspect,
  b: Body,
): { meaning: string; question: string } {
  const entry = synastry[pairKey(a, aspect, b)];
  if (!entry)
    throw new Error(
      `content/tr/synastry.json: missing "${pairKey(a, aspect, b)}"`,
    );
  return entry;
}

export function elementText(
  luminary: 'sun' | 'moon',
  a: Element,
  b: Element,
): string {
  return must(elements, elementKey(luminary, a, b), 'elements.json');
}

/** Score band per ADR-0003 damping: 50 is "no aspects". */
export function bandOf(score: number): Band {
  if (score < 40) return 'very-low';
  if (score < 55) return 'low';
  if (score < 70) return 'mid';
  if (score < 85) return 'high';
  return 'very-high';
}

export function bandText(score: number): string {
  return must(bands, bandOf(score), 'bands.json');
}

/** All keys the engine can emit, per file — the completeness contract. */
export const KEY_SPACES = {
  signs: (): string[] => [
    ...PLANETS.flatMap((p) => SIGNS.map((s) => signKey(p, s))),
    ...SIGNS.map((s) => signKey('ascendant', s)),
  ],
  houses: (): string[] =>
    PLANETS.flatMap((p) =>
      ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((h) =>
        houseKey(p, h),
      ),
    ),
  retrograde: (): string[] => [...RETRO_PLANETS],
  natalAspects: (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < BODIES.length; i++) {
      for (let j = i + 1; j < BODIES.length; j++) {
        // why: i and j are bounded by BODIES.length, so both indices resolve
        const a = BODIES[i] ?? 'sun';
        const b = BODIES[j] ?? 'sun';
        if (!emitted(a, b)) continue; // generational pairs are never scored
        for (const aspect of ASPECTS) {
          const key = `${a}-${aspect}-${b}`;
          if (!IMPOSSIBLE.has(key)) keys.push(key);
        }
      }
    }
    return keys;
  },
  synastry: (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < BODIES.length; i++) {
      for (let j = i; j < BODIES.length; j++) {
        const a = BODIES[i] ?? 'sun';
        const b = BODIES[j] ?? 'sun';
        if (!emitted(a, b)) continue;
        for (const aspect of ASPECTS) keys.push(`${a}-${aspect}-${b}`);
      }
    }
    return keys;
  },
  elements: (): string[] => {
    const keys: string[] = [];
    for (const lum of ['sun', 'moon'] as const) {
      for (let i = 0; i < ELEMENTS.length; i++) {
        for (let j = i; j < ELEMENTS.length; j++) {
          keys.push(`${lum}:${ELEMENTS[i] ?? 'fire'}-${ELEMENTS[j] ?? 'fire'}`);
        }
      }
    }
    return keys;
  },
  bands: (): string[] => [...BANDS],
} as const;

export const CONTENT_FILES = {
  signs,
  houses,
  retrograde,
  natalAspects,
  synastry: Object.fromEntries(
    Object.entries(synastry).map(([k, v]) => [k, v.meaning]),
  ),
  elements,
  bands,
} as const;
