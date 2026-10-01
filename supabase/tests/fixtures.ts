import type { Client } from './local';

/** Minimal profile rows for RLS tests. Charts are placeholders: RLS does not care. */
export type Gender = 'woman' | 'man' | 'unspecified';
export type Interest = 'women' | 'men' | 'everyone';

export interface ProfileInput {
  readonly id: string;
  readonly display_name: string;
  readonly gender: Gender;
  readonly interested_in: Interest;
  /** [longitude, latitude] */
  readonly lonLat: readonly [number, number];
  readonly radius_km?: number;
  readonly birth_date?: string;
  /** Discover hides a profile without one, so the default is one photo. */
  readonly photos?: readonly string[];
  readonly age_min?: number;
  readonly age_max?: number;
}

export const ISTANBUL: readonly [number, number] = [28.9784, 41.0082];
/** ~5 km north-east of ISTANBUL once both snap to 0.01° grid nodes. */
export const ISTANBUL_NEARBY: readonly [number, number] = [29.03, 41.04];
export const ANKARA: readonly [number, number] = [32.8597, 39.9334];
/** Mid-Atlantic: no other row can be within a 5 km radius, whatever the local DB holds. */
export const NOWHERE: readonly [number, number] = [-30.0, -20.0];
/**
 * Another empty stretch of ocean, ~700 km from NOWHERE. A second
 * describe that seeds a demo needs its own water: two demos in one
 * radius make every count in both blocks depend on which ran first.
 */
export const NOWHERE_ELSE: readonly [number, number] = [-35.0, -25.0];
/** A third, for the metrics describe's demo (rls.test.ts, "metrics"). */
export const NOWHERE_THIRD: readonly [number, number] = [-40.0, -10.0];
/** A valid starter key (a<b orientation); its content is irrelevant to RLS. */
export const STARTER = 'moon-trine-venus';

const PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

/**
 * A chart with the right shape and meaningless values. RLS does not care
 * what it says, but the server checks the shape now: a row the app cannot
 * parse used to blank the deck for every viewer in radius.
 */
const PLACEHOLDER_CHART = {
  version: 1,
  planets: Object.fromEntries(
    PLANETS.map((name, index) => [
      name,
      {
        longitude: index * 30,
        sign: 'aries',
        degree: 0,
        house: 1,
        retrograde: false,
      },
    ]),
  ),
  houses: {
    ascendant: 0,
    mc: 270,
    cusps: Array.from({ length: 12 }, (_, index) => index * 30),
  },
};

export function profileRow(input: ProfileInput) {
  const [lon, lat] = input.lonLat;
  return {
    id: input.id,
    display_name: input.display_name,
    birth_date: input.birth_date ?? '1995-07-14',
    birth_local: '1995-07-14T03:30:00',
    birth_city_id: 745044,
    birth_utc: '1995-07-14T00:30:00Z',
    chart: PLACEHOLDER_CHART,
    big_three: { sun: 'cancer', moon: 'aquarius', rising: 'gemini' },
    gender: input.gender,
    interested_in: input.interested_in,
    location: `SRID=4326;POINT(${lon} ${lat})`,
    radius_km: input.radius_km ?? 50,
    // Wide by default: a test that does not care about age must not be
    // filtered by it.
    age_min: input.age_min ?? 18,
    age_max: input.age_max ?? 99,
    // The version of the privacy notice the profile accepted. The column
    // has no default: a row without it is refused.
    consent_version: '2026-09-09',
    // The path only has to be inside the owner's folder; these tests never
    // read the object itself.
    photos: [...(input.photos ?? [`${input.id}/1.png`])],
  };
}

/**
 * The smallest valid PNG. `profiles.photos` now has to name an object that
 * exists, so a fixture profile needs a real upload behind its path.
 */
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Uploads a placeholder object for every path the row claims. */
export async function uploadPhotos(
  client: Client,
  paths: readonly string[],
): Promise<void> {
  for (const path of paths) {
    const { error } = await client.storage
      .from('photos')
      .upload(path, PIXEL_PNG, { contentType: 'image/png', upsert: true });
    if (error) throw new Error(`upload ${path}: ${error.message}`);
  }
}

/** Uploads the row's photos as that user, then inserts it as them (or as `inserter`). */
export async function insertProfileRow(
  client: Client,
  row: ReturnType<typeof profileRow> & { readonly is_demo?: boolean },
  /** Who inserts the row, when not the member who uploads the photos. */
  inserter: Client = client,
): Promise<void> {
  await uploadPhotos(client, row.photos);
  const { error } = await inserter.from('profiles').insert(row);
  if (error)
    throw new Error(`insert profile for ${row.display_name}: ${error.message}`);
}

/**
 * A launch demo's profile, written the way the seeding script writes it:
 * its photos uploaded as the demo, the row inserted by the service role
 * with the flag set, which no member can set for themselves.
 */
export async function insertDemoProfile(
  admin: Client,
  demo: { readonly client: Client },
  input: ProfileInput,
): Promise<void> {
  await insertProfileRow(
    demo.client,
    { ...profileRow(input), is_demo: true },
    admin,
  );
}
