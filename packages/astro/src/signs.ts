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
  // IEEE remainder is exact and, for positive operands, always < 360, so
  // the outer % also folds the case where (deg % 360) + 360 rounds to 360.
  return ((deg % 360) + 360) % 360;
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

/**
 * A longitude at the precision the product stores and shows: four
 * decimals, folded into [0, 360). Sign and degree must both be read from
 * this, never one from it and the other from the raw value — 29.99996
 * rounds into the next sign, and a pair taken from either side of the
 * rounding would name Aries at 0°00′ for a point at the very end of it.
 */
export function roundLongitude(longitude: number): number {
  return Number(normalizeDegrees(longitude).toFixed(4)) % 360;
}

/**
 * Degrees into the sign for an ecliptic longitude, rounded to four
 * decimals. The rounding is the point: float modulo of a 4-decimal value
 * is inexact (30.15 % 30 = 0.14999999999999858, which `formatDegree`
 * floors to 0°08′ instead of 0°09′), and a degree on screen is meant to
 * agree with astro.com (ADR-0009).
 */
export function degreeInSign(longitude: number): number {
  // Both roundings earn their place. The longitude is rounded first so
  // that a point in the last arcsecond of a sign lands in the next sign
  // here and in `signOf` alike — never 0°00′ of the sign it just left.
  // The reduction is rounded because float modulo of a 4-decimal value is
  // inexact (30.15 % 30 = 0.14999999999999858, floored to 0°08′ instead
  // of 0°09′). It cannot carry onto 30: a 4-decimal longitude's largest
  // reduction is 29.9999.
  return Number((roundLongitude(longitude) % 30).toFixed(4));
}

/** Signed angular difference folded into [-180, 180). */
export function signedDelta(deg: number): number {
  const d = normalizeDegrees(deg);
  return d >= 180 ? d - 360 : d;
}
