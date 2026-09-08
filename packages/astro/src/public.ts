import { z } from 'zod';
import { PLANETS, type Planet } from './bodies';
import type { Chart } from './chart';
import { SIGNS, signOf } from './signs';

/**
 * The chart as stored in `profiles.chart` and shown to other users:
 * placements and house cusps only — never the engine input (instant,
 * coordinates). Zod-validated both when the app writes it and when any
 * row is read back.
 */
const HouseNumberSchema = z.number().int().min(1).max(12);

export const PublicPlacementSchema = z.object({
  longitude: z.number().min(0).lt(360),
  sign: z.enum(SIGNS),
  degree: z.number().min(0).lt(30),
  house: HouseNumberSchema,
  retrograde: z.boolean(),
});

// why: z.record() with an enum key makes keys optional in zod 3; an explicit
// object keeps all ten planets required, with PLANETS as the source of truth.
const planetsShape = Object.fromEntries(
  PLANETS.map((planet) => [planet, PublicPlacementSchema]),
) as Record<Planet, typeof PublicPlacementSchema>;

export const PublicChartSchema = z.object({
  version: z.literal(1),
  planets: z.object(planetsShape),
  houses: z.object({
    ascendant: z.number().min(0).lt(360),
    mc: z.number().min(0).lt(360),
    cusps: z.array(z.number().min(0).lt(360)).length(12),
  }),
});

export type PublicChart = z.infer<typeof PublicChartSchema>;

export const BigThreeSchema = z.object({
  sun: z.enum(SIGNS),
  moon: z.enum(SIGNS),
  rising: z.enum(SIGNS),
});

export type BigThree = z.infer<typeof BigThreeSchema>;

/** Round to 4 decimals (< 1″) and fold a rounded-up 360 back to 0. */
const roundDeg = (value: number): number => Number(value.toFixed(4)) % 360;

/** Strip the engine input and round to 4 decimals (< 1″) for storage. */
export function toPublicChart(chart: Chart): PublicChart {
  const planets = {} as Record<Planet, z.infer<typeof PublicPlacementSchema>>; // why: filled for every PLANETS key below
  for (const planet of PLANETS) {
    const p = chart.planets[planet];
    const longitude = roundDeg(p.longitude);
    planets[planet] = {
      longitude,
      // Derived from the rounded longitude so sign, degree and longitude
      // stay mutually consistent at a sign boundary (29.99996 → 0 next sign).
      sign: signOf(longitude),
      degree: longitude % 30,
      house: p.house,
      retrograde: p.retrograde,
    };
  }
  return PublicChartSchema.parse({
    version: 1,
    planets,
    houses: {
      ascendant: roundDeg(chart.houses.ascendant),
      mc: roundDeg(chart.houses.mc),
      cusps: chart.houses.cusps.map(roundDeg),
    },
  });
}

export function bigThree(
  chart: Pick<PublicChart, 'planets'> & { houses: { ascendant: number } },
): BigThree {
  return {
    sun: chart.planets.sun.sign,
    moon: chart.planets.moon.sign,
    rising: signOf(chart.houses.ascendant),
  };
}
