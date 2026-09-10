import { PLANETS, type Planet } from './bodies';
import {
  DIMENSIONS,
  dimensionOf,
  isCurated,
  type Dimension,
} from './dimensions';
import {
  compatibility,
  elementOf,
  natalAspects,
  type Aspect,
  type Body,
  type ChartForScoring,
  type Compatibility,
  type InterAspect,
} from './compatibility';
import {
  IMPOSSIBLE_KEYS,
  PRIMARY_PLACEMENTS,
  RETRO_PLANETS,
  placementLabel,
  type PrimaryPlacement,
  aspectTitle,
  bandName,
  bandOf,
  bandText,
  dimensionLabelText,
  dimensionLevel,
  dimensionName,
  type Level,
  elementText,
  houseText,
  natalAspectText,
  pairKey,
  retrogradeText,
  signText,
  synastryText,
  type Band,
  type RetroPlanet,
} from './content';
import type { PublicChart } from './public';
import { signOf } from './signs';
import { BODY_TR, SIGN_TR_LOCATIVE, describeAspectTr } from './tr';

/**
 * Screen-ready interpretation of one chart: what to say for each planet
 * and for the strongest natal aspects. Pure; the UI only renders.
 */
export interface PlanetReading {
  readonly planet: Planet;
  readonly signText: string;
  readonly houseText: string;
  readonly retrogradeText: string | null;
}

/**
 * One of the six placements the chart screen leads with, titled by what it
 * means for dating: "Nasıl seversin · Venüs Akrep'te" rather than
 * "Venüs · Akrep · 7. ev" (PRD amendment 2026-09-10). The technical line
 * stays on screen under the product-language one — show the calculation,
 * soften the conclusion.
 */
export interface PrimaryReading {
  readonly placement: PrimaryPlacement;
  /** "Nasıl seversin". */
  readonly label: string;
  /** "Venüs Akrep'te" — the astrology, kept visible. */
  readonly technical: string;
  readonly text: string;
}

export interface NatalAspectReading {
  readonly aspect: InterAspect;
  readonly text: string;
}

export interface NatalReading {
  readonly risingText: string;
  /** The six cards the screen opens with. */
  readonly primary: readonly PrimaryReading[];
  /** All ten planets — behind "tüm haritanı gör". */
  readonly planets: readonly PlanetReading[];
  /** Strongest first; `limit` caps the list for the screen. */
  readonly aspects: readonly NatalAspectReading[];
}

const isRetroPlanet = (planet: Planet): planet is RetroPlanet =>
  (RETRO_PLANETS as readonly string[]).includes(planet);

export function natalReading(chart: PublicChart, limit = 8): NatalReading {
  const planets = PLANETS.map((planet) => {
    const p = chart.planets[planet];
    return {
      planet,
      signText: signText(planet, p.sign),
      houseText: houseText(planet, p.house),
      retrogradeText:
        p.retrograde && isRetroPlanet(planet) ? retrogradeText(planet) : null,
    };
  });
  // A tampered profile row could carry a geometrically impossible pair;
  // such an aspect is dropped rather than crashing the screen.
  const aspects = natalAspects(chart)
    .filter(
      (a) => !IMPOSSIBLE_KEYS.has(pairKey(a.planetA, a.aspect, a.planetB)),
    )
    .slice(0, limit)
    .map((aspect) => ({
      aspect,
      text: natalAspectText(aspect.planetA, aspect.aspect, aspect.planetB),
    }));
  const rising = signOf(chart.houses.ascendant);
  const primary = PRIMARY_PLACEMENTS.map((placement) => {
    const sign =
      placement === 'ascendant' ? rising : chart.planets[placement].sign;
    return {
      placement,
      label: placementLabel(placement),
      technical: `${BODY_TR[placement]} ${SIGN_TR_LOCATIVE[sign]}`,
      text: signText(placement, sign),
    };
  });
  return {
    risingText: signText('ascendant', rising),
    primary,
    planets,
    aspects,
  };
}

/**
 * Screen-ready synastry from the viewer's side. `viewer` is chart A of the
 * pair; headlines use "senin X'in onun Y'si" from that side, while meaning
 * and question are shared by both viewers.
 */
export interface SynastryAspectReading {
  readonly aspect: InterAspect;
  /** The dimension the pairing belongs to (ADR-0009 §1). */
  readonly dimension: Dimension;
  /** Card title, e.g. "Kolay çekim" — dimension and valence, not a verdict. */
  readonly title: string;
  /** "Ay'ın onun Venüs'üyle üçgen açı yapıyor." from the viewer's side. */
  readonly headline: string;
  readonly meaning: string;
  readonly question: string;
}

/** One dimension as the match screen shows it: a word, never a number. */
export interface DimensionReading {
  readonly dimension: Dimension;
  /** Turkish name of the axis, e.g. "Duygusal bağ". */
  readonly name: string;
  readonly level: Level;
  /** The label itself, e.g. "Kolay yakınlık". */
  readonly label: string;
}

export interface SynastryReading {
  /**
   * ADR-0009 §3: the ranking key, never printed. `band` and `bandName` are
   * what a screen may show.
   */
  readonly score: number;
  readonly band: Band;
  readonly bandName: string;
  readonly bandText: string;
  /** Absent dimensions are omitted, not shown at a low level. */
  readonly dimensions: readonly DimensionReading[];
  readonly sunElements: string;
  readonly moonElements: string;
  readonly aspects: readonly SynastryAspectReading[];
  readonly match: Compatibility;
}

export function synastryReading(
  viewer: ChartForScoring,
  other: ChartForScoring,
  limit = 5,
): SynastryReading {
  const match = compatibility(viewer, other);
  const aspects = [...match.aspects]
    .sort((x, y) => Math.abs(y.term) - Math.abs(x.term) || x.orb - y.orb)
    .slice(0, limit);
  const aspectReadings = readAspects(aspects);
  const dimensions: DimensionReading[] = [];
  for (const dimension of DIMENSIONS) {
    const level = dimensionLevel(dimension, match.dimensions[dimension]);
    if (level === null) continue;
    dimensions.push({
      dimension,
      name: dimensionName(dimension),
      level,
      label: dimensionLabelText(dimension, level),
    });
  }
  return {
    score: match.score,
    band: bandOf(match.score),
    bandName: bandName(match.score),
    bandText: bandText(match.score),
    dimensions,
    sunElements: elementText(
      'sun',
      elementOf(viewer.planets.sun.sign),
      elementOf(other.planets.sun.sign),
    ),
    moonElements: elementText(
      'moon',
      elementOf(viewer.planets.moon.sign),
      elementOf(other.planets.moon.sign),
    ),
    aspects: aspectReadings,
    match,
  };
}

/** Reads a list together, so no two cards on one screen share a title. */
function readAspects(
  aspects: readonly InterAspect[],
  taken: Set<string> = new Set(),
): SynastryAspectReading[] {
  return aspects.map((aspect) => {
    const reading = readAspect(aspect, taken);
    taken.add(reading.title);
    return reading;
  });
}

function readAspect(
  aspect: InterAspect,
  taken: ReadonlySet<string> = new Set(),
): SynastryAspectReading {
  const dimension = dimensionOf(aspect.planetA, aspect.planetB);
  if (dimension === null)
    throw new Error(
      `${aspect.planetA}|${aspect.planetB} is outside the dimension table`,
    );
  const { meaning, question } = synastryText(
    aspect.planetA,
    aspect.aspect,
    aspect.planetB,
  );
  return {
    aspect,
    dimension,
    title: aspectTitle(
      dimension,
      aspect.term,
      `${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`,
      taken,
    ),
    headline: describeAspectTr(aspect),
    meaning,
    question,
  };
}

/** Opening line parts for a stored starter key, from the viewer's side. */
export function starterFromKey(
  key: {
    readonly planetA: Body;
    readonly aspect: Aspect;
    readonly planetB: Body;
  },
  viewerIsA: boolean,
): { headline: string; meaning: string; question: string } {
  const mine = viewerIsA ? key.planetA : key.planetB;
  const theirs = viewerIsA ? key.planetB : key.planetA;
  const { meaning, question } = synastryText(
    key.planetA,
    key.aspect,
    key.planetB,
  );
  return {
    headline: describeAspectTr({
      planetA: mine,
      aspect: key.aspect,
      planetB: theirs,
    }),
    meaning,
    question,
  };
}

/**
 * The match page's two aspect sections (ADR-0009 §5).
 *
 * Both fill from the curated pairings first, ranked by |term| then by the
 * tighter orb, and widen to every scored pairing when a section comes up
 * short. A section with nothing to show is empty and is omitted with its
 * heading — never filled with a verdict, and never padded.
 *
 * Falling short of three cards is a different thing from an empty section
 * and much commoner: the section simply shows what there is.
 */
export interface MatchSections {
  /** "Neden birbirinize çekiliyorsunuz" — up to three, harmonious. */
  readonly drawn: readonly SynastryAspectReading[];
  /** "Burası ilginç" — one tense aspect, or none. */
  readonly interesting: readonly SynastryAspectReading[];
}

const DRAWN_LIMIT = 3;
const INTERESTING_LIMIT = 1;

/** |term| desc, then the tighter orb; ties settled by a stable triple. */
function rank(aspects: readonly InterAspect[]): readonly InterAspect[] {
  return [...aspects].sort(
    (x, y) =>
      Math.abs(y.term) - Math.abs(x.term) ||
      x.orb - y.orb ||
      `${x.planetA}-${x.planetB}-${x.aspect}`.localeCompare(
        `${y.planetA}-${y.planetB}-${y.aspect}`,
      ),
  );
}

function fill(
  aspects: readonly InterAspect[],
  wanted: (a: InterAspect) => boolean,
  limit: number,
): readonly InterAspect[] {
  const eligible = aspects.filter(wanted);
  const curated = rank(eligible.filter((a) => isCurated(a.planetA, a.planetB)));
  if (curated.length >= limit) return curated.slice(0, limit);
  // Widen: the curated list alone leaves a gap in roughly one pair in six.
  const rest = rank(eligible.filter((a) => !isCurated(a.planetA, a.planetB)));
  return [...curated, ...rest].slice(0, limit);
}

export function matchSections(match: Compatibility): MatchSections {
  // One `taken` set across both sections: the match screen is one screen,
  // and a title repeated between them reads exactly as wrong.
  const taken = new Set<string>();
  return {
    // `compatibility()` buckets a term of exactly 0 as harmony (an aspect
    // sitting on its maximum orb), so a card is a card here too.
    drawn: readAspects(
      fill(match.aspects, (a) => a.term >= 0, DRAWN_LIMIT),
      taken,
    ),
    interesting: readAspects(
      fill(match.aspects, (a) => a.term < 0, INTERESTING_LIMIT),
      taken,
    ),
  };
}
