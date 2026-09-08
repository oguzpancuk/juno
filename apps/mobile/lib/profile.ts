import {
  BigThreeSchema,
  PublicChartSchema,
  bigThree,
  computeChart,
  toPublicChart,
  type PublicChart,
} from '@stardate/astro';
import { resolveBirth, type LocalDateTime } from '@stardate/geo';
import { z } from 'zod';
import { supabase } from './supabase';

export const GENDERS = ['woman', 'man', 'unspecified'] as const;
export const INTERESTS = ['women', 'men', 'everyone'] as const;
export type Gender = (typeof GENDERS)[number];
export type Interest = (typeof INTERESTS)[number];

/** Own profile as read back from `profiles` (Zod at the row boundary). */
export const OwnProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  birth_date: z.string(),
  birth_city_id: z.number().int(),
  chart: PublicChartSchema,
  big_three: BigThreeSchema,
  gender: z.enum(GENDERS),
  interested_in: z.enum(INTERESTS),
  radius_km: z.number().int(),
});

export type OwnProfile = z.infer<typeof OwnProfileSchema>;

export type ProfileState =
  | { readonly status: 'loading' }
  | { readonly status: 'missing' }
  | { readonly status: 'ready'; readonly profile: OwnProfile }
  | { readonly status: 'error'; readonly message: string };

export async function fetchOwnProfile(userId: string): Promise<ProfileState> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, birth_date, birth_city_id, chart, big_three, gender, interested_in, radius_km',
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) return { status: 'error', message: error.message };
  if (!data) return { status: 'missing' };
  const parsed = OwnProfileSchema.safeParse(data);
  if (!parsed.success) {
    return {
      status: 'error',
      message: `profile row invalid: ${parsed.error.message}`,
    };
  }
  return { status: 'ready', profile: parsed.data };
}

export interface OnboardingInput {
  readonly userId: string;
  readonly displayName: string;
  readonly gender: Gender;
  readonly interestedIn: Interest;
  readonly cityId: number;
  readonly local: LocalDateTime;
  /** Device location if granted; otherwise the city centre is used. */
  readonly device?:
    { readonly latitude: number; readonly longitude: number } | undefined;
}

export const MIN_AGE_YEARS = 18;

export function isAtLeast18(local: LocalDateTime, today = new Date()): boolean {
  const cutoff = new Date(
    Date.UTC(
      today.getUTCFullYear() - MIN_AGE_YEARS,
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );
  const birth = new Date(Date.UTC(local.year, local.month - 1, local.day));
  return birth <= cutoff;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Compute the chart on device and insert the profile. The stored chart is
 * the public form (no instant, no coordinates); birth data lives in its
 * own private columns.
 */
export async function createProfile(
  input: OnboardingInput,
): Promise<{ chart: PublicChart } | { error: string }> {
  if (!isAtLeast18(input.local)) return { error: 'underage' };
  const birth = resolveBirth({ cityId: input.cityId, local: input.local });
  const chart = toPublicChart(
    computeChart({
      utc: birth.utc,
      latitude: birth.latitude,
      longitude: birth.longitude,
    }),
  );
  const point = input.device ?? {
    latitude: birth.latitude,
    longitude: birth.longitude,
  };
  const { local } = input;
  const { error } = await supabase.from('profiles').insert({
    id: input.userId,
    display_name: input.displayName,
    birth_date: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
    birth_local: `${local.year}-${pad(local.month)}-${pad(local.day)}T${pad(local.hour)}:${pad(local.minute)}:00`,
    birth_city_id: input.cityId,
    birth_utc: birth.utc.toISOString(),
    chart,
    big_three: bigThree(chart),
    gender: input.gender,
    interested_in: input.interestedIn,
    location: `SRID=4326;POINT(${point.longitude} ${point.latitude})`,
  });
  if (error) return { error: error.message };
  return { chart };
}
