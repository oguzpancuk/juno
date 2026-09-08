import { SunPosition } from 'astronomy-engine';
import { signOf, type Sign } from './signs.js';

/** Apparent geocentric ecliptic longitude of the Sun, degrees in [0, 360). */
export function sunLongitude(utc: Date): number {
  return SunPosition(utc).elon;
}

/** Tropical Sun sign for a UTC instant. */
export function sunSign(utc: Date): Sign {
  return signOf(sunLongitude(utc));
}
