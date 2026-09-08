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

/** Normalise any finite angle in degrees into [0, 360). Throws on NaN/±∞. */
export function normalizeDegrees(deg: number): number {
  if (!Number.isFinite(deg)) {
    throw new RangeError(
      `normalizeDegrees: expected a finite number, got ${deg}`,
    );
  }
  const d = ((deg % 360) + 360) % 360;
  // (-1e-15 % 360 + 360) % 360 can round to exactly 360; fold it back.
  return d === 360 ? 0 : d;
}

/** Sign for an ecliptic longitude in degrees (tropical zodiac). */
export function signOf(longitude: number): Sign {
  const index = Math.floor(normalizeDegrees(longitude) / 30);
  const sign = SIGNS[index];
  if (sign === undefined) {
    // why: normalizeDegrees guarantees 0 <= index <= 11; this guard exists
    // only to satisfy noUncheckedIndexedAccess without a silent fallback.
    throw new RangeError(
      `signOf: index ${index} out of range for ${longitude}`,
    );
  }
  return sign;
}
