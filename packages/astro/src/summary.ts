import { PLANETS, type Planet } from './bodies';
import { DIMENSIONS, type Dimension } from './dimensions';
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
  RETRO_PLANETS,
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
import { describeAspectTr } from './tr';

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

export interface NatalAspectReading {
  readonly aspect: InterAspect;
  readonly text: string;
}

export interface NatalReading {
  readonly risingText: string;
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
  return {
    risingText: signText('ascendant', signOf(chart.houses.ascendant)),
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
    .slice(0, limit)
    .map((aspect) => readAspect(aspect));
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
    aspects,
    match,
  };
}

function readAspect(aspect: InterAspect): SynastryAspectReading {
  const { meaning, question } = synastryText(
    aspect.planetA,
    aspect.aspect,
    aspect.planetB,
  );
  return { aspect, headline: describeAspectTr(aspect), meaning, question };
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
