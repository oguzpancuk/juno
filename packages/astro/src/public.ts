import { z } from 'zod';
import { PLANETS, type Planet } from './bodies';
import type { Chart } from './chart';
import { SIGNS, degreeInSign, roundLongitude, signOf } from './signs';

/**
 * The chart as stored in `profiles.chart` and shown to other users:
 * placements and house cusps only — never the engine input (instant,
 * coordinates). Zod-validated both when the app writes it and when any
 * row is read back.
 */
// A literal union so the parsed type is HouseNumber, not number.
const HouseNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12),
]);

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

/** Strip the engine input and round to 4 decimals (< 1″) for storage. */
export function toPublicChart(chart: Chart): PublicChart {
  const planets = {} as Record<Planet, z.infer<typeof PublicPlacementSchema>>; // why: filled for every PLANETS key below
  for (const planet of PLANETS) {
    const p = chart.planets[planet];
    const longitude = roundLongitude(p.longitude);
    planets[planet] = {
      longitude,
      // Derived from the rounded longitude so sign, degree and longitude
      // stay mutually consistent at a sign boundary (29.99996 → 0 next sign).
      sign: signOf(longitude),
      degree: degreeInSign(longitude),
      house: p.house,
      retrograde: p.retrograde,
    };
  }
  return PublicChartSchema.parse({
    version: 1,
    planets,
    houses: {
      ascendant: roundLongitude(chart.houses.ascendant),
      mc: roundLongitude(chart.houses.mc),
      cusps: chart.houses.cusps.map(roundLongitude),
    },
  });
}

export function bigThree(
  chart: Pick<PublicChart, 'planets'> & { houses: { ascendant: number } },
): BigThree {
  return {
    sun: chart.planets.sun.sign,
    moon: chart.planets.moon.sign,
    // Rounded like everything else that names this sign: the parameter
    // is structural, so a caller can hand over a chart `toPublicChart`
    // has not been through, and this one is stored in a column.
    rising: signOf(roundLongitude(chart.houses.ascendant)),
  };
}
