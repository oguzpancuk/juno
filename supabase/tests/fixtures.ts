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
}

export const ISTANBUL: readonly [number, number] = [28.9784, 41.0082];
/** ~5 km north-east of ISTANBUL once both snap to 0.01° grid nodes. */
export const ISTANBUL_NEARBY: readonly [number, number] = [29.03, 41.04];
export const ANKARA: readonly [number, number] = [32.8597, 39.9334];
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
  };
}
