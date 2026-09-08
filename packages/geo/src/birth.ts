import { z } from 'zod';
import { cityById } from './cities';
import { localToUtc } from './time';
import { LocalDateTimeSchema, type City } from './schema';

export const BirthPlaceTimeSchema = z.object({
  cityId: z.number().int().positive(),
  local: LocalDateTimeSchema,
});

export type BirthPlaceTime = z.infer<typeof BirthPlaceTimeSchema>;

export interface ResolvedBirth {
  readonly utc: Date;
  readonly latitude: number;
  readonly longitude: number;
  readonly timeZone: string;
  readonly city: City;
}

/** City id + wall-clock birth time → what the chart engine needs. */
export function resolveBirth(raw: BirthPlaceTime): ResolvedBirth {
  const { cityId, local } = BirthPlaceTimeSchema.parse(raw);
  const city = cityById(cityId);
  if (!city) throw new RangeError(`unknown city id ${cityId}`);
  return {
    utc: localToUtc(local, city.timeZone),
    latitude: city.latitude,
    longitude: city.longitude,
    timeZone: city.timeZone,
    city,
  };
}
