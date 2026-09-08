import { MakeTime, SiderealTime, e_tilt } from 'astronomy-engine';
import { normalizeDegrees } from './signs';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * Placidus cusps do not exist where part of the ecliptic never rises or
 * sets (|latitude| > 90° − obliquity ≈ 66.5°): the semi-arc equation has
 * no solution (|cos SA| > 1) and the Ascendant formula is singular at
 * RAMC 90°/270°. No better solver lifts this; the cap is 66° to keep a
 * margin below the obliquity-dependent limit.
 */
export const MAX_PLACIDUS_LATITUDE = 66;

/** Twelve cusps, index 0 = house 1, degrees [0, 360). */
export type Cusps = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** House number 1–12. */
export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Houses {
  /** Ecliptic longitude of the Ascendant (cusp 1), degrees [0, 360). */
  readonly ascendant: number;
  /** Ecliptic longitude of the Midheaven (cusp 10), degrees [0, 360). */
  readonly mc: number;
  /** Twelve Placidus cusps, index 0 = house 1, degrees [0, 360). */
  readonly cusps: Cusps;
  /** Right ascension of the MC, degrees; kept for tests and diagnostics. */
  readonly ramc: number;
  /** True obliquity of the ecliptic used, degrees. */
  readonly obliquity: number;
}

/** Ecliptic longitude of the point on the ecliptic with right ascension `ra`. */
function eclipticLongitudeOfRA(raDeg: number, obliquityDeg: number): number {
  const ra = raDeg * DEG;
  return normalizeDegrees(
    Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(obliquityDeg * DEG)) * RAD,
  );
}

function midheaven(ramcDeg: number, obliquityDeg: number): number {
  return eclipticLongitudeOfRA(ramcDeg, obliquityDeg);
}

function ascendant(
  ramcDeg: number,
  obliquityDeg: number,
  latitudeDeg: number,
): number {
  const ramc = ramcDeg * DEG;
  const eps = obliquityDeg * DEG;
  const phi = latitudeDeg * DEG;
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  return normalizeDegrees(Math.atan2(y, x) * RAD);
}

/**
 * One Placidus cusp by fixed-point iteration on right ascension.
 * `fraction` is the share of the semi-arc (1/3 or 2/3); `offsetDeg` is 0
 * for the cusps between MC and Ascendant (11, 12) and 180 for those
 * between IC and Ascendant (2, 3); `sign` is +1 above the horizon
 * (diurnal semi-arc, measured from the MC) and −1 below (nocturnal
 * semi-arc, measured back from the IC).
 */
function placidusCusp(
  ramcDeg: number,
  obliquityDeg: number,
  latitudeDeg: number,
  fraction: number,
  offsetDeg: number,
  sign: 1 | -1,
): number {
  const eps = obliquityDeg * DEG;
  const tanPhi = Math.tan(latitudeDeg * DEG);
  const tanEps = Math.tan(eps);
  let ra = ramcDeg + offsetDeg + sign * fraction * 90;
  let converged = false;
  for (let i = 0; i < 100; i++) {
    // Declination of the ecliptic point at RA: tan δ = tan ε · sin α.
    // Semi-arc from the meridian to the horizon: cos SA = −tan φ · tan δ.
    const cosSA = -sign * tanPhi * tanEps * Math.sin(ra * DEG);
    if (Math.abs(cosSA) > 1) {
      throw new RangeError(
        `Placidus cusp does not exist at latitude ${latitudeDeg}`,
      );
    }
    const semiArc = Math.acos(cosSA) * RAD;
    const next = ramcDeg + offsetDeg + sign * fraction * semiArc;
    const step = Math.abs(next - ra);
    ra = next;
    if (step < 1e-9) {
      converged = true;
      break;
    }
  }
  if (!converged) {
    // why: the contraction factor is ≤ 0.65 inside the latitude cap, so
    // this is unreachable; a silent stale value would be worse than a throw.
    throw new RangeError(
      `Placidus cusp did not converge at latitude ${latitudeDeg}`,
    );
  }
  return eclipticLongitudeOfRA(ra, obliquityDeg);
}

/**
 * Ascendant, MC and Placidus cusps for a UTC instant and place.
 * Right ascension of the MC is Greenwich apparent sidereal time plus the
 * east longitude; obliquity is the true obliquity of date.
 */
export function computeHouses(
  utc: Date,
  latitudeDeg: number,
  longitudeDeg: number,
): Houses {
  if (Math.abs(latitudeDeg) > MAX_PLACIDUS_LATITUDE) {
    throw new RangeError(
      `Placidus houses are undefined beyond ±${MAX_PLACIDUS_LATITUDE}° latitude (got ${latitudeDeg})`,
    );
  }
  const time = MakeTime(utc);
  const obliquity = e_tilt(time).tobl;
  const ramc = normalizeDegrees(SiderealTime(time) * 15 + longitudeDeg);

  const asc = ascendant(ramc, obliquity, latitudeDeg);
  const mc = midheaven(ramc, obliquity);
  const cusp = (fraction: number, offset: number, sign: 1 | -1) =>
    placidusCusp(ramc, obliquity, latitudeDeg, fraction, offset, sign);
  const c11 = cusp(1 / 3, 0, 1);
  const c12 = cusp(2 / 3, 0, 1);
  const c2 = cusp(2 / 3, 180, -1);
  const c3 = cusp(1 / 3, 180, -1);
  const opposite = (deg: number) => normalizeDegrees(deg + 180);

  const cusps: Cusps = [
    asc,
    c2,
    c3,
    opposite(mc),
    opposite(c11),
    opposite(c12),
    opposite(asc),
    opposite(c2),
    opposite(c3),
    mc,
    c11,
    c12,
  ];
  return { ascendant: asc, mc, cusps, ramc, obliquity };
}

/**
 * House (1–12) containing an ecliptic longitude, given cusps in zodiacal
 * order. A longitude exactly on a cusp belongs to the house that cusp
 * starts.
 */
export function houseOf(longitude: number, cusps: Cusps): HouseNumber {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i] ?? 0; // why: tuple index is always in range; ?? satisfies noUncheckedIndexedAccess
    const end = cusps[(i + 1) % 12] ?? 0;
    const span = normalizeDegrees(end - start);
    const offset = normalizeDegrees(longitude - start);
    if (offset < span) return (i + 1) as HouseNumber; // why: i is 0..11, so i + 1 is a HouseNumber
  }
  // why: the twelve spans tile the full circle, so a longitude in [0, 360)
  // always lands in one of them; this guard only exists for the type system.
  throw new RangeError(`houseOf: ${longitude} matched no house`);
}
