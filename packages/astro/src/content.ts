import { z } from 'zod';
import { PLANETS, type Planet } from './bodies';
import {
  ASPECTS,
  BODIES,
  OUTER_BODIES,
  type Aspect,
  type Body,
} from './compatibility';

const emitted = (a: Body, b: Body): boolean =>
  !(OUTER_BODIES.has(a) && OUTER_BODIES.has(b));
/**
 * Geometrically impossible in a real chart. Mercury stays within ~28° of
 * the Sun and Venus within ~48°, so with the engine's orbs (sextile needs
 * ≥ 56° separation) only a conjunction can form between the Sun and either;
 * Mercury–Venus can reach 76°, so their sextile is real but square, trine
 * and opposition are not. Such keys are neither emitted nor required.
 */
const IMPOSSIBLE = new Set<string>([
  ...['sextile', 'square', 'trine', 'opposition'].flatMap((asp) => [
    `sun-${asp}-mercury`,
    `sun-${asp}-venus`,
  ]),
  ...['square', 'trine', 'opposition'].map((asp) => `mercury-${asp}-venus`),
]);
import { SIGNS, type Sign } from './signs';
import type { HouseNumber } from './houses';
import calibrationRaw from '../content/calibration.json';
import trBands from '../content/tr/bands.json';
import trDimensions from '../content/tr/dimensions.json';
import trElements from '../content/tr/elements.json';
import trHouses from '../content/tr/houses.json';
import trNatalAspects from '../content/tr/natal-aspects.json';
import trOverlayHouses from '../content/tr/overlay-houses.json';
import trOverlays from '../content/tr/overlays.json';
import trPlacements from '../content/tr/placements.json';
import trRetrograde from '../content/tr/retrograde.json';
import trSigns from '../content/tr/signs.json';
import trSynastry from '../content/tr/synastry.json';
import trTitles from '../content/tr/titles.json';
import enBands from '../content/en/bands.json';
import enDimensions from '../content/en/dimensions.json';
import enElements from '../content/en/elements.json';
import enHouses from '../content/en/houses.json';
import enNatalAspects from '../content/en/natal-aspects.json';
import enOverlayHouses from '../content/en/overlay-houses.json';
import enOverlays from '../content/en/overlays.json';
import enPlacements from '../content/en/placements.json';
import enRetrograde from '../content/en/retrograde.json';
import enSigns from '../content/en/signs.json';
import enSynastry from '../content/en/synastry.json';
import enTitles from '../content/en/titles.json';
import esBands from '../content/es/bands.json';
import esDimensions from '../content/es/dimensions.json';
import esElements from '../content/es/elements.json';
import esHouses from '../content/es/houses.json';
import esNatalAspects from '../content/es/natal-aspects.json';
import esOverlayHouses from '../content/es/overlay-houses.json';
import esOverlays from '../content/es/overlays.json';
import esPlacements from '../content/es/placements.json';
import esRetrograde from '../content/es/retrograde.json';
import esSigns from '../content/es/signs.json';
import esSynastry from '../content/es/synastry.json';
import esTitles from '../content/es/titles.json';
import { currentLanguage, type Language } from './language';

/**
 * Interpretation texts, one directory per language under `content/`:
 * Turkish is the source, every other language a translation of it with
 * the same files and the same keys. Every key the engine can emit must
 * have a non-empty entry in every language; `content.test.ts` enumerates
 * the key spaces below per language and fails when one is missing, so a
 * content gap can never reach a screen. Texts are data, not astrology
 * logic: the engine decides which keys apply, the language only which
 * words are read for them (`language.ts`).
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

/**
 * Four bands, not five, and no verdict in any of them (ADR-0009 §3). The
 * score itself is never printed; this is what reaches a screen.
 */
export const BANDS = ['quiet', 'even', 'strong', 'rare'] as const;
export type Band = (typeof BANDS)[number];

/** Three labels per dimension, cut from that dimension's own distribution. */
export const LEVELS = ['low', 'mid', 'high'] as const;
export type Level = (typeof LEVELS)[number];

const Label = z.string().trim().min(3).max(40);
const BandEntry = z.object({ name: Label, text: Snippet });
const DimensionEntry = z.object({
  name: Label,
  low: Label,
  mid: Label,
  high: Label,
});
/**
 * Every body a chart card is written for, in the order the profile reads
 * them: the three the page opens with, then the rest as the "tüm
 * haritanı gör" popup continues the same list (owner, 2026-09-11: "bir
 * kez, baştan sona, aynı formatta"). Titled by what they mean for dating
 * rather than by the planet's name (PRD amendment 2026-09-10).
 * Conventional planet order, with the Ascendant lifted to third where the
 * profile shows it.
 */
export const PLACEMENTS: readonly Body[] = [
  'sun',
  'moon',
  'ascendant',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

/**
 * The planets whose house overlay is worth a card, and the houses worth
 * naming for dating (ADR-0009, ROADMAP C5). Both directions: a planet of
 * theirs in a house of yours reads differently from the reverse.
 */
export const OVERLAY_PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
] as const;
export type OverlayPlanet = (typeof OVERLAY_PLANETS)[number];
export const OVERLAY_HOUSES = [1, 5, 7, 8, 11, 12] as const;
export type OverlayHouse = (typeof OVERLAY_HOUSES)[number];
export const OVERLAY_DIRECTIONS = ['theirs', 'yours'] as const;
export type OverlayDirection = (typeof OVERLAY_DIRECTIONS)[number];

export function overlayKey(
  planet: OverlayPlanet,
  house: OverlayHouse,
  direction: OverlayDirection,
): string {
  return `${planet}-${house}-${direction}`;
}

/** What the house means for dating: "Ortaklık", "Yakınlık ve yoğunluk". */
export function overlayHouseTheme(house: OverlayHouse): string {
  return must((b) => b.overlayHouses, String(house), 'overlay-houses.json');
}

export function overlayText(
  planet: OverlayPlanet,
  house: OverlayHouse,
  direction: OverlayDirection,
): string {
  return must(
    (b) => b.overlays,
    overlayKey(planet, house, direction),
    'overlays.json',
  );
}
/**
 * Aspect card titles, keyed by dimension and valence rather than by pairing:
 * one table of thirty instead of a title on each of the 255 texts, and the
 * dimension table decides which applies (ADR-0009 §1).
 */

/**
 * The calibrated surface, generated by `scripts/score-distribution.ts` and
 * committed: three cut points for the overall bands and two per dimension.
 * Thirteen numbers, and the only place a threshold is allowed to live.
 */
const Calibration = z.object({
  charts: z.number().int().positive(),
  pairs: z.number().int().positive(),
  seed: z.number().int().positive(),
  bands: z.array(z.number()).length(3),
  labels: z.record(z.string(), z.array(z.number()).length(2)),
});
export const CALIBRATION = Calibration.parse(calibrationRaw);

/**
 * The Turkish source's files. Their names are the list of content files:
 * every other language has the same ones (`RAW` below, and the content
 * tests), so a new file is added here first.
 */
const TR_RAW = {
  'bands.json': trBands,
  'dimensions.json': trDimensions,
  'elements.json': trElements,
  'houses.json': trHouses,
  'natal-aspects.json': trNatalAspects,
  'overlay-houses.json': trOverlayHouses,
  'overlays.json': trOverlays,
  'placements.json': trPlacements,
  'retrograde.json': trRetrograde,
  'signs.json': trSigns,
  'synastry.json': trSynastry,
  'titles.json': trTitles,
} as const;
type ContentFile = keyof typeof TR_RAW;

/** One language's texts, as the files under `content/<language>/` hold them. */
const RAW: Readonly<Record<Language, Readonly<Record<ContentFile, unknown>>>> =
  {
    tr: TR_RAW,
    en: {
      'bands.json': enBands,
      'dimensions.json': enDimensions,
      'elements.json': enElements,
      'houses.json': enHouses,
      'natal-aspects.json': enNatalAspects,
      'overlay-houses.json': enOverlayHouses,
      'overlays.json': enOverlays,
      'placements.json': enPlacements,
      'retrograde.json': enRetrograde,
      'signs.json': enSigns,
      'synastry.json': enSynastry,
      'titles.json': enTitles,
    },
    es: {
      'bands.json': esBands,
      'dimensions.json': esDimensions,
      'elements.json': esElements,
      'houses.json': esHouses,
      'natal-aspects.json': esNatalAspects,
      'overlay-houses.json': esOverlayHouses,
      'overlays.json': esOverlays,
      'placements.json': esPlacements,
      'retrograde.json': esRetrograde,
      'signs.json': esSigns,
      'synastry.json': esSynastry,
      'titles.json': esTitles,
    },
  };

function parseBundle(language: Language) {
  const raw = RAW[language];
  return {
    language,
    signs: SnippetMap.parse(raw['signs.json']),
    houses: SnippetMap.parse(raw['houses.json']),
    retrograde: SnippetMap.parse(raw['retrograde.json']),
    natalAspects: SnippetMap.parse(raw['natal-aspects.json']),
    synastry: z.record(z.string(), SynastryEntry).parse(raw['synastry.json']),
    elements: SnippetMap.parse(raw['elements.json']),
    bands: z.record(z.string(), BandEntry).parse(raw['bands.json']),
    placements: z.record(z.string(), Label).parse(raw['placements.json']),
    overlays: SnippetMap.parse(raw['overlays.json']),
    overlayHouses: z
      .record(z.string(), Label)
      .parse(raw['overlay-houses.json']),
    titles: z
      .record(z.string(), z.array(Label).length(3))
      .parse(raw['titles.json']),
    dimensionLabels: z
      .record(z.string(), DimensionEntry)
      .parse(raw['dimensions.json']),
  };
}
type Bundle = ReturnType<typeof parseBundle>;

/**
 * Each language's files are validated on first use rather than at import:
 * a member reads one language, and parsing the others would only cost
 * start-up time. Turkish is parsed at import, as it always was, so a
 * broken source file still fails the moment anything loads the engine.
 */
const bundles = new Map<Language, Bundle>([['tr', parseBundle('tr')]]);

/** The texts of `language`, the current one unless named. */
function bundle(language: Language = currentLanguage()): Bundle {
  let found = bundles.get(language);
  if (found === undefined) {
    found = parseBundle(language);
    bundles.set(language, found);
  }
  return found;
}

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

/** The entry at `key` in the current language's `file`, or a named gap. */
function must<T>(
  select: (b: Bundle) => Record<string, T>,
  key: string,
  file: ContentFile,
): T {
  const b = bundle();
  const entry = select(b)[key];
  if (entry === undefined)
    throw new Error(`content/${b.language}/${file}: missing "${key}"`);
  return entry;
}

export function signText(body: Planet | 'ascendant', sign: Sign): string {
  return must((b) => b.signs, signKey(body, sign), 'signs.json');
}

export function houseText(planet: Planet, house: HouseNumber): string {
  return must((b) => b.houses, houseKey(planet, house), 'houses.json');
}

export function retrogradeText(planet: RetroPlanet): string {
  return must((b) => b.retrograde, planet, 'retrograde.json');
}

export function natalAspectText(a: Body, aspect: Aspect, b: Body): string {
  return must(
    (content) => content.natalAspects,
    pairKey(a, aspect, b),
    'natal-aspects.json',
  );
}

/**
 * Whether a pairing has a synastry text at all.
 *
 * The engine only ever emits pairings the dimension table scores, and
 * every one of those is covered — but a stored `likes.starter_key` is
 * only checked against a format, and the format admits 605 keys against
 * 255 written ones. A key from outside that set must read as "no starter"
 * rather than throwing on a screen that was only trying to render a row.
 */
export function hasSynastryText(a: Body, aspect: Aspect, b: Body): boolean {
  return bundle().synastry[pairKey(a, aspect, b)] !== undefined;
}

export function synastryText(
  a: Body,
  aspect: Aspect,
  b: Body,
): { meaning: string; question: string } {
  return must((c) => c.synastry, pairKey(a, aspect, b), 'synastry.json');
}

export function elementText(
  luminary: 'sun' | 'moon',
  a: Element,
  b: Element,
): string {
  return must((b) => b.elements, elementKey(luminary, a, b), 'elements.json');
}

/** Score band per ADR-0003 damping: 50 is "no aspects". */
/**
 * The band a raw score falls in. Cuts come from the committed calibration,
 * never from hand-picked numbers: they are the 25th, 50th and 75th
 * percentiles of the measured population, so the four bands are as near
 * equal as a discrete score allows.
 */
export function bandOf(score: number): Band {
  const [first, second, third] = CALIBRATION.bands;
  if (first === undefined || second === undefined || third === undefined)
    throw new Error('calibration.json has no band cuts');
  if (score < first) return 'quiet';
  if (score < second) return 'even';
  if (score < third) return 'strong';
  return 'rare';
}

export function bandName(score: number): string {
  return mustBand(bandOf(score)).name;
}

export function bandText(score: number): string {
  return mustBand(bandOf(score)).text;
}

function mustBand(band: Band): { name: string; text: string } {
  return must((b) => b.bands, band, 'bands.json');
}

/**
 * A dimension's label, or null when the dimension renders absent — no
 * aspect counted into it, element bonus or not (ADR-0009 §2): the bonus is
 * not an aspect, so nothing on screen would explain a label.
 */
export function dimensionLevel(
  dimension: string,
  sums: {
    readonly harmony: number;
    readonly tension: number;
    readonly absolute: number;
    readonly terms: number;
  },
): Level | null {
  if (sums.terms === 0) return null;
  const cuts = CALIBRATION.labels[dimension];
  if (cuts === undefined)
    throw new Error(`calibration.json has no cuts for "${dimension}"`);
  const [low, high] = cuts;
  if (low === undefined || high === undefined)
    throw new Error(`calibration.json has bad cuts for "${dimension}"`);
  // Growth reads the absolute sum: a square to Uranus is signal there, not
  // deficit. The other four read the signed split.
  const value =
    dimension === 'growth'
      ? reduceScore(sums.absolute, 0)
      : reduceScore(sums.harmony, sums.tension);
  if (value < low) return 'low';
  if (value < high) return 'mid';
  return 'high';
}

/** ADR-0003's mapping applied to one dimension's own terms. */
function reduceScore(harmony: number, tension: number): number {
  return 50 + (50 * (harmony - tension)) / (harmony + tension + 10);
}

export function dimensionName(dimension: string): string {
  return mustDimension(dimension).name;
}

export function dimensionLabelText(dimension: string, level: Level): string {
  return mustDimension(dimension)[level];
}

function mustDimension(dimension: string): z.infer<typeof DimensionEntry> {
  return must((b) => b.dimensionLabels, dimension, 'dimensions.json');
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
  overlays: (): string[] =>
    OVERLAY_PLANETS.flatMap((planet) =>
      OVERLAY_HOUSES.flatMap((house) =>
        OVERLAY_DIRECTIONS.map((direction) =>
          overlayKey(planet, house, direction),
        ),
      ),
    ),
} as const;

export const IMPOSSIBLE_KEYS: ReadonlySet<string> = IMPOSSIBLE;

/** One language's snippet texts per file, flattened for the content tests. */
export function contentFiles(language: Language) {
  const b = bundle(language);
  return {
    signs: b.signs,
    houses: b.houses,
    retrograde: b.retrograde,
    natalAspects: b.natalAspects,
    synastry: Object.fromEntries(
      Object.entries(b.synastry).map(([k, v]) => [k, v.meaning]),
    ),
    elements: b.elements,
    overlays: b.overlays,
    bands: Object.fromEntries(
      Object.entries(b.bands).map(([k, v]) => [k, v.text]),
    ),
  } as const;
}

/** The Turkish source's files, which the layering rules are written against. */
export const CONTENT_FILES = contentFiles('tr');

/** "Nasıl seversin" for Venus — the product-language title of a placement. */
export function placementLabel(placement: Body): string {
  return must((b) => b.placements, placement, 'placements.json');
}

/**
 * A stable variant index for an aspect, so the same pair always reads the
 * same way. Not random: a title that changed between two visits would look
 * like the chart had changed.
 */
function variantOf(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++)
    hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  return hash % 3;
}

/**
 * The card title for an inter-chart aspect: "Kolay çekim", "Yüklü kimya".
 * Soft and hard are not good and bad — a square is a dynamic, and the hard
 * titles say what it is rather than judging it (ADR-0009 §1, PRD amendment).
 */
export function aspectTitle(
  dimension: string,
  term: number,
  key: string,
  taken: ReadonlySet<string> = new Set(),
): string {
  const valence = term >= 0 ? 'soft' : 'hard';
  const entry = must((b) => b.titles, `${dimension}-${valence}`, 'titles.json');
  // Start at the stable variant, then step on if that title is already on
  // the screen: two cards reading "Anlaşılan taraf" in one section looks
  // like a bug, and there are only three variants per bucket to collide in.
  const start = variantOf(key);
  for (let step = 0; step < entry.length; step++) {
    const choice = entry[(start + step) % entry.length];
    if (choice !== undefined && !taken.has(choice)) return choice;
  }
  const fallback = entry[start];
  if (fallback === undefined)
    throw new Error(
      `content/${bundle().language}/titles.json: short of variants`,
    );
  return fallback;
}
