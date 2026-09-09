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
}

export const ISTANBUL: readonly [number, number] = [28.9784, 41.0082];
/** ~5 km north-east of ISTANBUL once both snap to 0.01° grid nodes. */
export const ISTANBUL_NEARBY: readonly [number, number] = [29.03, 41.04];
export const ANKARA: readonly [number, number] = [32.8597, 39.9334];
/** Mid-Atlantic: no other row can be within a 5 km radius, whatever the local DB holds. */
export const NOWHERE: readonly [number, number] = [-30.0, -20.0];
/** A valid starter key (a<b orientation); its content is irrelevant to RLS. */
export const STARTER = 'moon-trine-venus';

export function profileRow(input: ProfileInput) {
  const [lon, lat] = input.lonLat;
  return {
    id: input.id,
    display_name: input.display_name,
    birth_date: input.birth_date ?? '1995-07-14',
    birth_local: '1995-07-14T03:30:00',
    birth_city_id: 745044,
    birth_utc: '1995-07-14T00:30:00Z',
    chart: { version: 1, planets: {}, houses: {} },
    big_three: { sun: 'cancer', moon: 'aquarius', rising: 'gemini' },
    gender: input.gender,
    interested_in: input.interested_in,
    location: `SRID=4326;POINT(${lon} ${lat})`,
    radius_km: input.radius_km ?? 50,
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

/** Uploads the row's photos, then inserts it as that user. */
export async function insertProfileRow(
  client: Client,
  row: ReturnType<typeof profileRow>,
): Promise<void> {
  await uploadPhotos(client, row.photos);
  const { error } = await client.from('profiles').insert(row);
  if (error)
    throw new Error(`insert profile for ${row.display_name}: ${error.message}`);
}
