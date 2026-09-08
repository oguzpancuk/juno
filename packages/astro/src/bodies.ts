import { Body } from 'astronomy-engine';

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
export const PLANET_BODY: Readonly<Record<Planet, Body>> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};
