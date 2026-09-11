import { Ecliptic, GeoVector } from 'astronomy-engine';
import { z } from 'zod';
import { PLANETS, PLANET_BODY, type Planet } from './bodies';
import {
  MAX_PLACIDUS_LATITUDE,
  computeHouses,
  houseOf,
  type HouseNumber,
  type Houses,
} from './houses';
import { normalizeDegrees, signOf, signedDelta, type Sign } from './signs';

/**
 * Birth instant and place. The engine never sees local time or a zone.
 * Latitude is capped where Placidus houses stop existing (ADR-0004).
 */
export const ChartInputSchema = z.object({
  utc: z.date(),
  latitude: z
    .number()
    .finite()
    .refine((v) => Math.abs(v) <= MAX_PLACIDUS_LATITUDE, {
      message: `latitude must be within ±${MAX_PLACIDUS_LATITUDE}° for Placidus houses`,
    }),
  longitude: z.number().finite().min(-180).max(180),
});

export type ChartInput = z.infer<typeof ChartInputSchema>;

export interface Placement {
  readonly body: Planet;
  /** Apparent geocentric ecliptic longitude of date, tropical, [0, 360). */
  readonly longitude: number;
  readonly sign: Sign;
  /** Degrees into the sign, [0, 30). */
  readonly degree: number;
  readonly retrograde: boolean;
  /** Placidus house, 1–12. */
  readonly house: HouseNumber;
}

export interface Chart {
  readonly input: ChartInput;
  readonly planets: Readonly<Record<Planet, Placement>>;
  readonly houses: Houses;
}

const HALF_HOUR_MS = 30 * 60 * 1000;

/**
 * Apparent geocentric ecliptic longitude of date for a planet, in degrees.
 * GeoVector gives J2000 equatorial with aberration; Ecliptic rotates it to
 * the true ecliptic and equinox of date, which is what the tropical zodiac
 * is measured from.
 */
export function geocentricLongitude(planet: Planet, utc: Date): number {
  const vector = GeoVector(PLANET_BODY[planet], utc, true);
  return normalizeDegrees(Ecliptic(vector).elon);
}

/**
 * Retrograde when the apparent longitude is decreasing at `utc`. A central
 * difference (t ± 30 min) estimates the velocity at t itself; a forward
 * difference would flip the flag 30 minutes early around every station.
 */
function isRetrograde(planet: Planet, utc: Date): boolean {
  if (planet === 'sun' || planet === 'moon') return false;
  const before = geocentricLongitude(
    planet,
    new Date(utc.getTime() - HALF_HOUR_MS),
  );
  const after = geocentricLongitude(
    planet,
    new Date(utc.getTime() + HALF_HOUR_MS),
  );
  return signedDelta(after - before) < 0;
}

function place(planet: Planet, utc: Date, houses: Houses): Placement {
  const longitude = geocentricLongitude(planet, utc);
  return {
    body: planet,
    longitude,
    sign: signOf(longitude),
    // Not `degreeInSign`: this field is the engine's own, and
    // `chart.test.ts` pins sign * 30 + degree back to the longitude at
    // 5e-10. Rounding is the public chart's job (`toPublicChart`), which
    // is what every displayed degree goes through.
    degree: longitude % 30,
    retrograde: isRetrograde(planet, utc),
    house: houseOf(longitude, houses.cusps),
  };
}

/**
 * Compute the natal placements for a birth instant. Input is validated at
 * this boundary even when the caller is typed; the engine is pure and
 * deterministic for equal inputs.
 */
export function computeChart(raw: ChartInput): Chart {
  const input = ChartInputSchema.parse(raw);
  const houses = computeHouses(input.utc, input.latitude, input.longitude);
  const planets = {} as Record<Planet, Placement>; // why: filled for every PLANETS key just below
  for (const planet of PLANETS) {
    planets[planet] = place(planet, input.utc, houses);
  }
  return { input, planets, houses };
}
