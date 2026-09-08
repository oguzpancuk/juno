import { Ecliptic, GeoVector } from 'astronomy-engine';
import { z } from 'zod';
import { PLANETS, PLANET_BODY, type Planet } from './bodies';
import { normalizeDegrees, signOf, signedDelta, type Sign } from './signs';

/** Birth instant and place. The engine never sees local time or a zone. */
export const ChartInputSchema = z.object({
  utc: z
    .date()
    .refine((d) => Number.isFinite(d.getTime()), 'utc must be a valid Date'),
  latitude: z.number().finite().min(-90).max(90),
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
}

export interface Chart {
  readonly input: ChartInput;
  readonly planets: Readonly<Record<Planet, Placement>>;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

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

function isRetrograde(planet: Planet, utc: Date, longitude: number): boolean {
  if (planet === 'sun' || planet === 'moon') return false;
  const later = geocentricLongitude(
    planet,
    new Date(utc.getTime() + ONE_HOUR_MS),
  );
  return signedDelta(later - longitude) < 0;
}

function place(planet: Planet, utc: Date): Placement {
  const longitude = geocentricLongitude(planet, utc);
  return {
    body: planet,
    longitude,
    sign: signOf(longitude),
    degree: longitude % 30,
    retrograde: isRetrograde(planet, utc, longitude),
  };
}

/**
 * Compute the natal placements for a birth instant. Input is validated at
 * this boundary even when the caller is typed; the engine is pure and
 * deterministic for equal inputs.
 */
export function computeChart(raw: ChartInput): Chart {
  const input = ChartInputSchema.parse(raw);
  const planets = {} as Record<Planet, Placement>; // why: filled for every PLANETS key just below
  for (const planet of PLANETS) {
    planets[planet] = place(planet, input.utc);
  }
  return { input, planets };
}
