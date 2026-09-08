import { z } from 'zod';

/** Whether the platform's Intl knows this IANA zone. */
export function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const CitySchema = z.object({
  /** GeoNames id; stable across rebuilds. */
  id: z.number().int().positive(),
  /** Display name (local spelling where GeoNames' primary name is ASCII). */
  name: z.string().min(1),
  /** GeoNames ASCII name, used for diacritic-insensitive search. */
  ascii: z.string().min(1),
  /** ISO 3166-1 alpha-2. */
  country: z.string().length(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  population: z.number().int().nonnegative(),
  timeZone: z.string().min(1),
});

export type City = z.infer<typeof CitySchema>;

export const CityListSchema = z.array(CitySchema).min(1);

/** Wall-clock time as the user reads it off a birth certificate. */
export const LocalDateTimeSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export type LocalDateTime = z.infer<typeof LocalDateTimeSchema>;

export const TimeZoneSchema = z
  .string()
  .min(1)
  .refine(isKnownTimeZone, { message: 'unknown IANA time zone' });
