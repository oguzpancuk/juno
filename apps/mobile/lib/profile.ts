import {
  BANDS,
  BigThreeSchema,
  PublicChartSchema,
  bigThree,
  computeChart,
  toPublicChart,
  type PublicChart,
} from '@juno/astro';
import {
  isValidCalendarDate,
  resolveBirth,
  type LocalDateTime,
} from '@juno/geo';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';
import { LEGAL_VERSION } from './legal';
import { supabase } from './supabase';

/** The four elements a Sun sign can have, as the filter offers them. */
export const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
export type SunElement = (typeof ELEMENTS)[number];

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
  age_min: z.number().int(),
  age_max: z.number().int(),
  /**
   * Applied on the device, not by `discover`: the band comes from a score
   * this app computes from two charts, and the element from the same
   * chart. The server can only keep the value inside its domain.
   */
  min_band: z.enum(BANDS),
  /** null means every element — an empty list would mean nobody. */
  sun_elements: z.array(z.enum(ELEMENTS)).nullable(),
  bio: z.string().nullable(),
  photos: z.array(z.string()),
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
      'id, display_name, birth_date, birth_city_id, chart, big_three, gender, interested_in, radius_km, age_min, age_max, min_band, sun_elements, bio, photos',
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

/**
 * Same rule as the DB CHECK (`birth_date <= current_date - 18 years`,
 * Postgres interval arithmetic: 29 Feb − 18 y = 28 Feb), on the UTC
 * calendar the DB also uses.
 */
export function isAtLeast18(local: LocalDateTime, today = new Date()): boolean {
  const y = today.getUTCFullYear() - MIN_AGE_YEARS;
  const m = today.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cutoff = Date.UTC(y, m, Math.min(today.getUTCDate(), lastDay));
  return Date.UTC(local.year, local.month - 1, local.day) <= cutoff;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Compute the chart on device and insert the profile. The stored chart is
 * the public form (no instant, no coordinates); birth data lives in its
 * own private columns.
 */
export type CreateProfileResult =
  | { readonly ok: true; readonly chart: PublicChart }
  | {
      readonly ok: false;
      readonly reason:
        | 'underage'
        | 'exists'
        | 'invalid-date'
        | 'birth-instant'
        | 'unknown-city';
    }
  | {
      readonly ok: false;
      readonly reason: 'db';
      readonly error: PostgrestError;
    };

/** One retry, then give up: the round trip is on the sign-up path. */
const BIRTH_INSTANT_TIMEOUT_MS = 8000;

/** Longer than the birth-instant call: this one writes, and writes retry. */
const PROFILE_INSERT_TIMEOUT_MS = 15000;

/**
 * The instant a wall clock in a city refers to, as the server computes
 * it. Asked rather than computed here, because a phone's zone database
 * can be years out of date and the two answers then differ by as much as
 * an hour — and the server refuses what it did not compute.
 *
 * Returns null if the server cannot be reached. There is no offline
 * fallback on purpose: onboarding writes a row, so it needs the network
 * anyway, and using this device's answer instead produced an insert the
 * server rejected as "invalid data" with nothing the person could change.
 */
async function serverBirthInstant(
  cityId: number,
  birthLocal: string,
): Promise<Date | 'unknown-city' | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .rpc('birth_instant', { city_id: cityId, local_time: birthLocal })
      // Without a signal a stalled connection leaves the button spinning
      // for ever, which is worse than telling the person to try again.
      .abortSignal(AbortSignal.timeout(BIRTH_INSTANT_TIMEOUT_MS));
    if (!error) {
      const parsed = z.string().safeParse(data);
      const instant = parsed.success ? new Date(parsed.data) : null;
      if (instant && !Number.isNaN(instant.getTime())) return instant;
    }
    // A city the server does not know is not worth retrying, and telling
    // the person to check their connection would be a lie: it happens
    // when the app ships a city list the database has not caught up with.
    if (error?.code === '23514') return 'unknown-city';
    // Neither is a missing function or an expired token: retrying burns a
    // round trip and reports a connection problem that does not exist.
    if (error?.code === '42883' || error?.code === 'PGRST202') return null;
    if (error?.code === 'PGRST301') return null;
    // A moment before trying again: an instant retry usually lands while
    // whatever failed is still failing.
    if (attempt === 0) await new Promise((wake) => setTimeout(wake, 400));
  }
  return null;
}

export async function createProfile(
  input: OnboardingInput,
): Promise<CreateProfileResult> {
  if (
    !isValidCalendarDate(input.local.year, input.local.month, input.local.day)
  ) {
    return { ok: false, reason: 'invalid-date' };
  }
  if (!isAtLeast18(input.local)) return { ok: false, reason: 'underage' };
  const birth = resolveBirth({ cityId: input.cityId, local: input.local });
  const { local } = input;
  const birthLocal = `${local.year}-${pad(local.month)}-${pad(local.day)}T${pad(local.hour)}:${pad(local.minute)}:00`;
  // The server's own conversion, not this device's: see the helper.
  const utc = await serverBirthInstant(input.cityId, birthLocal);
  if (utc === 'unknown-city') return { ok: false, reason: 'unknown-city' };
  if (utc === null) return { ok: false, reason: 'birth-instant' };
  const chart = toPublicChart(
    computeChart({
      utc,
      latitude: birth.latitude,
      longitude: birth.longitude,
    }),
  );
  const point = input.device ?? {
    latitude: birth.latitude,
    longitude: birth.longitude,
  };
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: input.userId,
      display_name: input.displayName,
      birth_date: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
      birth_local: birthLocal,
      birth_city_id: input.cityId,
      birth_utc: utc.toISOString(),
      chart,
      big_three: bigThree(chart),
      gender: input.gender,
      interested_in: input.interestedIn,
      location: `SRID=4326;POINT(${point.longitude} ${point.latitude})`,
      // Which version of the privacy notice was accepted. The column has no
      // default, so a profile cannot be created without one; the timestamp
      // is stamped by the server.
      consent_version: LEGAL_VERSION,
    })
    // supabase-js has no request timeout of its own. Without this a
    // connection that stalls mid-insert leaves the caller awaiting for
    // ever — and the caller is the onboarding screen, which by then has
    // replaced the form with a full-screen "your chart is being
    // calculated" that has no way out.
    .abortSignal(AbortSignal.timeout(PROFILE_INSERT_TIMEOUT_MS));
  if (error) {
    // A lost response after a committed insert: the profile exists, move on.
    if (error.code === '23505') return { ok: false, reason: 'exists' };
    return { ok: false, reason: 'db', error };
  }
  return { ok: true, chart };
}
