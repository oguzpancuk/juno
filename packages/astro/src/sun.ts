import { geocentricLongitude } from './chart';
import { signOf, type Sign } from './signs';

/** Apparent geocentric ecliptic longitude of the Sun, degrees in [0, 360). */
export function sunLongitude(utc: Date): number {
  return geocentricLongitude('sun', utc);
}

/** Tropical Sun sign for a UTC instant. */
export function sunSign(utc: Date): Sign {
  return signOf(sunLongitude(utc));
}
