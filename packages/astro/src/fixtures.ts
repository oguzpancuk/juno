import { z } from 'zod';
import { PLANETS, type Planet } from './bodies';

/**
 * Shape of the reference charts in `__fixtures__/`, produced by
 * `scripts/gen-fixtures.py` from the Swiss Ephemeris. Parsed with Zod so a
 * malformed fixture fails loudly instead of passing vacuously.
 */
const PlanetRefSchema = z.object({
  longitude: z.number().min(0).max(360),
  retrograde: z.boolean(),
  house: z.number().int().min(1).max(12),
});

// why: z.record() with an enum key makes every key optional in zod 3; the
// cast keeps the ten keys required, and PLANETS is the source of truth.
const planetsShape = Object.fromEntries(
  PLANETS.map((planet) => [planet, PlanetRefSchema]),
) as Record<Planet, typeof PlanetRefSchema>;

export const ReferenceChartSchema = z.object({
  id: z.string().min(1),
  note: z.string(),
  source: z.string(),
  input: z.object({
    utc: z.string().datetime(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  planets: z.object(planetsShape),
  ascendant: z.number().min(0).max(360),
  mc: z.number().min(0).max(360),
  cusps: z.array(z.number().min(0).max(360)).length(12),
});

export type ReferenceChart = z.infer<typeof ReferenceChartSchema>;
