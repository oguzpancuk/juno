import { z } from 'zod';
import { PLANETS, type Planet } from './bodies';
import type { Chart } from './chart';
import { SIGNS, type Sign } from './signs';

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

const round = (value: number, decimals: number): number =>
  Number(value.toFixed(decimals));

/** Strip the engine input and round to 4 decimals (< 1″) for storage. */
export function toPublicChart(chart: Chart): PublicChart {
  const planets = {} as Record<Planet, z.infer<typeof PublicPlacementSchema>>; // why: filled for every PLANETS key below
  for (const planet of PLANETS) {
    const p = chart.planets[planet];
    planets[planet] = {
      longitude: round(p.longitude, 4),
      sign: p.sign,
      degree: round(p.degree, 4),
      house: p.house,
      retrograde: p.retrograde,
    };
  }
  return PublicChartSchema.parse({
    version: 1,
    planets,
    houses: {
      ascendant: round(chart.houses.ascendant, 4),
      mc: round(chart.houses.mc, 4),
      cusps: chart.houses.cusps.map((c) => round(c, 4)),
    },
  });
}

export function bigThree(
  chart: Pick<PublicChart, 'planets'> & { houses: { ascendant: number } },
): BigThree {
  const risingIndex = Math.floor(chart.houses.ascendant / 30);
  const rising: Sign = SIGNS[risingIndex] ?? 'aries'; // why: ascendant is in [0, 360) so the index is 0..11
  return { sun: chart.planets.sun.sign, moon: chart.planets.moon.sign, rising };
}
