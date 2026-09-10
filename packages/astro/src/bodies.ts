import { Body as AstroBody } from 'astronomy-engine';

/** The ten bodies a natal chart places, in conventional order. */
export const PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

export type Planet = (typeof PLANETS)[number];

/** astronomy-engine body for each planet. */
export const PLANET_BODY: Readonly<Record<Planet, AstroBody>> = {
  sun: AstroBody.Sun,
  moon: AstroBody.Moon,
  mercury: AstroBody.Mercury,
  venus: AstroBody.Venus,
  mars: AstroBody.Mars,
  jupiter: AstroBody.Jupiter,
  saturn: AstroBody.Saturn,
  uranus: AstroBody.Uranus,
  neptune: AstroBody.Neptune,
  pluto: AstroBody.Pluto,
};

/**
 * Everything a synastry aspect can involve: the ten planets plus the
 * Ascendant. Lives here rather than in `compatibility.ts` so the dimension
 * table can share it without the two importing each other.
 */
export const BODIES = [...PLANETS, 'ascendant'] as const;

export type Body = (typeof BODIES)[number];

/** Generational: pairs where both are in this set are not scored (ADR-0003). */
export const OUTER_BODIES: ReadonlySet<Body> = new Set([
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]);
