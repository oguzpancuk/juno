/** The twelve tropical zodiac signs, in ecliptic order starting at 0° Aries. */
export const SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

export type Sign = (typeof SIGNS)[number];

/** Normalise any angle in degrees into [0, 360). */
export function normalizeDegrees(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** Sign for an ecliptic longitude in degrees (tropical zodiac). */
export function signOf(longitude: number): Sign {
  const index = Math.floor(normalizeDegrees(longitude) / 30);
  // why: index is 0..11 by construction, but noUncheckedIndexedAccess
  // cannot see that; the fallback is unreachable.
  return SIGNS[index] ?? 'aries';
}
