import raw from './data/cities.json';
import { CityListSchema, type City } from './schema';

/**
 * Lower-case, diacritic-free key for prefix search. Turkish dotted/dotless
 * i both fold to "i" so "İstanbul", "Istanbul" and "istanbul" agree.
 */
export function searchKey(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

interface IndexedCity {
  readonly city: City;
  readonly keys: readonly string[];
}

let index: readonly IndexedCity[] | undefined;
let byId: ReadonlyMap<number, City> | undefined;

function load(): readonly IndexedCity[] {
  if (index === undefined) {
    // Validated once, at first use: the JSON is a build artefact and is
    // treated as an external boundary.
    const cities = CityListSchema.parse(raw);
    index = cities.map((city) => ({
      city,
      keys: [...new Set([searchKey(city.name), searchKey(city.ascii)])],
    }));
    byId = new Map(cities.map((city) => [city.id, city]));
  }
  return index;
}

/** Every bundled city, sorted by population (desc). */
export function allCities(): readonly City[] {
  return load().map((entry) => entry.city);
}

export function cityById(id: number): City | undefined {
  load();
  return byId?.get(id);
}

/**
 * Prefix search on name or ASCII name, diacritic-insensitive; exact
 * matches first, then by population. Empty query returns nothing.
 */
export function searchCities(query: string, limit = 10): City[] {
  const key = searchKey(query);
  if (key.length === 0 || limit <= 0) return [];
  const exact: City[] = [];
  const prefix: City[] = [];
  for (const { city, keys } of load()) {
    if (keys.includes(key)) exact.push(city);
    else if (keys.some((k) => k.startsWith(key))) prefix.push(city);
    if (exact.length >= limit) break;
  }
  return [...exact, ...prefix].slice(0, limit);
}
