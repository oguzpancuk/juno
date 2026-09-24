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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Turkish names for places whose GeoNames spelling is foreign: a Turkish
 * user types "Viyana", not "Vienna". Matched by (ascii name, country) so
 * a GeoNames id change cannot silently point the entry somewhere else;
 * an entry that no longer resolves fails `cities.test.ts`.
 */
interface Exonym {
  /** What the user types. */
  readonly tr: string;
  /** GeoNames ascii name. */
  readonly ascii: string;
  /** ISO 3166-1 alpha-2, to disambiguate repeated names. */
  readonly country: string;
}

export const EXONYMS: readonly Exonym[] = [
  { tr: 'Viyana', ascii: 'Vienna', country: 'AT' },
  { tr: 'Münih', ascii: 'Munich', country: 'DE' },
  { tr: 'Köln', ascii: 'Koeln', country: 'DE' },
  { tr: 'Nürnberg', ascii: 'Nuremberg', country: 'DE' },
  { tr: 'Londra', ascii: 'London', country: 'GB' },
  { tr: 'Roma', ascii: 'Rome', country: 'IT' },
  { tr: 'Milano', ascii: 'Milan', country: 'IT' },
  { tr: 'Napoli', ascii: 'Naples', country: 'IT' },
  { tr: 'Floransa', ascii: 'Florence', country: 'IT' },
  { tr: 'Atina', ascii: 'Athens', country: 'GR' },
  { tr: 'Selanik', ascii: 'Thessaloniki', country: 'GR' },
  { tr: 'Moskova', ascii: 'Moscow', country: 'RU' },
  { tr: 'Sofya', ascii: 'Sofia', country: 'BG' },
  { tr: 'Bükreş', ascii: 'Bucharest', country: 'RO' },
  { tr: 'Budapeşte', ascii: 'Budapest', country: 'HU' },
  { tr: 'Prag', ascii: 'Prague', country: 'CZ' },
  { tr: 'Varşova', ascii: 'Warsaw', country: 'PL' },
  { tr: 'Belgrad', ascii: 'Belgrade', country: 'RS' },
  { tr: 'Saraybosna', ascii: 'Sarajevo', country: 'BA' },
  { tr: 'Üsküp', ascii: 'Skopje', country: 'MK' },
  { tr: 'Kopenhag', ascii: 'Copenhagen', country: 'DK' },
  { tr: 'Stokholm', ascii: 'Stockholm', country: 'SE' },
  { tr: 'Lizbon', ascii: 'Lisbon', country: 'PT' },
  { tr: 'Brüksel', ascii: 'Brussels', country: 'BE' },
  { tr: 'Cenevre', ascii: 'Geneva', country: 'CH' },
  { tr: 'Zürih', ascii: 'Zuerich', country: 'CH' },
  { tr: 'Lefkoşa', ascii: 'Nicosia', country: 'CY' },
  { tr: 'Kahire', ascii: 'Cairo', country: 'EG' },
  { tr: 'İskenderiye', ascii: 'Alexandria', country: 'EG' },
  { tr: 'Şam', ascii: 'Damascus', country: 'SY' },
  { tr: 'Halep', ascii: 'Aleppo', country: 'SY' },
  { tr: 'Beyrut', ascii: 'Beirut', country: 'LB' },
  { tr: 'Bağdat', ascii: 'Baghdad', country: 'IQ' },
  { tr: 'Musul', ascii: 'Mosul', country: 'IQ' },
  { tr: 'Tahran', ascii: 'Tehran', country: 'IR' },
  { tr: 'Kudüs', ascii: 'Jerusalem', country: 'IL' },
  { tr: 'Riyad', ascii: 'Riyadh', country: 'SA' },
  { tr: 'Cidde', ascii: 'Jeddah', country: 'SA' },
  { tr: 'Mekke', ascii: 'Makkah', country: 'SA' },
  { tr: 'Medine', ascii: 'Madinah', country: 'SA' },
  { tr: 'Bakü', ascii: 'Baku', country: 'AZ' },
  { tr: 'Tiflis', ascii: 'Tbilisi', country: 'GE' },
  { tr: 'Erivan', ascii: 'Yerevan', country: 'AM' },
  { tr: 'Taşkent', ascii: 'Tashkent', country: 'UZ' },
  { tr: 'Bişkek', ascii: 'Bishkek', country: 'KG' },
  { tr: 'Pekin', ascii: 'Beijing', country: 'CN' },
  { tr: 'Şangay', ascii: 'Shanghai', country: 'CN' },
  { tr: 'Seul', ascii: 'Seoul', country: 'KR' },
  { tr: 'Cakarta', ascii: 'Jakarta', country: 'ID' },
  { tr: 'Bombay', ascii: 'Mumbai', country: 'IN' },
  { tr: 'Yeni Delhi', ascii: 'New Delhi', country: 'IN' },
  { tr: 'Cezayir', ascii: 'Algiers', country: 'DZ' },
  { tr: 'Tunus', ascii: 'Tunis', country: 'TN' },
];

interface IndexedCity {
  readonly city: City;
  /** Whole-name keys: the display name and the ascii name. */
  readonly keys: readonly string[];
  /** Word tokens of both keys, so "york" reaches "New York". */
  readonly words: readonly string[];
}

let index: readonly IndexedCity[] | undefined;
let byId: ReadonlyMap<number, City> | undefined;
let exonyms: ReadonlyMap<string, City> | undefined;

const tokens = (key: string): string[] =>
  key.split(/[^a-z0-9]+/).filter((word) => word.length > 0);

function load(): readonly IndexedCity[] {
  if (index === undefined) {
    // Validated once, at first use: the JSON is a build artefact and is
    // treated as an external boundary.
    const cities = CityListSchema.parse(raw);
    index = cities.map((city) => {
      const keys = [...new Set([searchKey(city.name), searchKey(city.ascii)])];
      return {
        city,
        keys,
        words: [...new Set(keys.flatMap(tokens))],
      };
    });
    byId = new Map(cities.map((city) => [city.id, city]));
    // The list is population-sorted, so the first hit is the intended one.
    const resolved = new Map<string, City>();
    for (const { tr, ascii, country } of EXONYMS) {
      const key = searchKey(ascii);
      const city = cities.find(
        (c) => c.country === country && searchKey(c.ascii) === key,
      );
      if (city) resolved.set(searchKey(tr), city);
    }
    exonyms = resolved;
  }
  return index;
}

/** Cities reachable by a Turkish exonym, keyed by the typed form. */
export function exonymCities(): ReadonlyMap<string, City> {
  load();
  return exonyms ?? new Map();
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
 * How far a point may be from a record's coordinates and still be
 * answered with it. A city here is one coordinate pair, so someone
 * across town is already tens of kilometres from it; 30 km covers the
 * spread of the largest Turkish cities without reaching a city an hour
 * away — Bursa is 92 km from İstanbul, Adapazarı 39 km from İzmit.
 *
 * It does NOT mean everything inside the circle is the same place.
 * Türkiye at this size is dense: Tarsus has Mersin 25 km off, Gebze has
 * İstanbul's outer districts 22 km off, Burdur has İsparta at 24 km.
 * What keeps those apart is `POPULATION_RATIO`, not the radius.
 */
const CITY_RADIUS_KM = 30;

/**
 * How much bigger a neighbour must be before it answers for the record a
 * point actually stands nearest to.
 *
 * The list holds districts beside cities, and a district's coordinates
 * are the nearer ones for anyone standing in it, so nearest alone says
 * "Eminönü" for Sultanahmet. But most populous in reach is worse: it
 * lets any large neighbour swallow a city whole, which said "Sancaktepe"
 * for Gebze and "Mersin" for Tarsus.
 *
 * A district is smaller than its city by an order of magnitude —
 * İstanbul is 283 times Eminönü and 30 times Üsküdar — while two cities
 * that merely sit near each other are within a factor of two: Sancaktepe
 * is 1.7 times Gebze, Mersin 1.5 times Tarsus, İsparta 1.8 times Burdur.
 * Five sits above every pair of that second kind and below every district
 * that has to keep working.
 *
 * It is not a threshold with empty space around it, and the next person to
 * tune it should know that: 26 Turkish records are answered at under ten
 * times, the lowest at 5.3. Several of those are right (Akçaabat at 5.4
 * and Genç at 5.7 are districts of the city they get). Bulancak is what
 * the number costs — it answers "Ordu", the next province's city 29 km
 * off, while Giresun, its own province's city 13 km away, is 2.9 times it
 * and cannot qualify. Nothing between 3 and 5 would fix that without
 * losing the pairs above, so five stands, but as a choice rather than a
 * measurement.
 */
const POPULATION_RATIO = 5;

const EARTH_KM = 6371;
const RADIAN = Math.PI / 180;

/**
 * Great-circle distance in kilometres. Haversine rather than a flat
 * subtraction of the coordinates: longitudes wrap, and two points either
 * side of the antimeridian are neighbours however far apart their
 * numbers are.
 *
 * Exported for the test that proves that; `cityAt` is the way to use it.
 */
export function distanceKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = (bLat - aLat) * RADIAN;
  const dLon = (bLon - aLon) * RADIAN;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * RADIAN) * Math.cos(bLat * RADIAN) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The city a point is in, or undefined when nothing is within
 * `CITY_RADIUS_KM` — open country has no answer to "which city are you
 * in", and the nearest town an hour away is not it.
 *
 * The record the point stands nearest to, unless one in reach is
 * `POPULATION_RATIO` times its size and in the same country: then that
 * one, because only a city outweighs its own district by so much. A
 * bigger neighbour that is merely bigger does not qualify, which is what
 * keeps Gebze, Tarsus and Burdur their own names, and the country test
 * keeps Kowloon out of Shenzhen and Johor Bahru out of Singapore, where
 * the ratio holds but the border means it is not where you are.
 *
 * Populations are compared rather than trusting the list's own order, so
 * a rebuild that sorted differently cannot change the answer.
 *
 * Offline, like everything else here: no reverse-geocoding service sees
 * the point, which is the whole reason the coordinates can be used for
 * this at all.
 */
export function cityAt(latitude: number, longitude: number): City | undefined {
  let nearest: City | undefined;
  let nearestKm = Infinity;
  const inReach: City[] = [];
  for (const { city } of load()) {
    const km = distanceKm(latitude, longitude, city.latitude, city.longitude);
    if (km > CITY_RADIUS_KM) continue;
    inReach.push(city);
    if (km < nearestKm) {
      nearestKm = km;
      nearest = city;
    }
  }
  if (nearest === undefined) return undefined;
  let best = nearest;
  for (const city of inReach) {
    if (city.country !== nearest.country) continue;
    if (city.population < nearest.population * POPULATION_RATIO) continue;
    // The largest that qualifies, so a district of İstanbul reached from
    // a town outside it cannot come back instead of İstanbul.
    if (city.population > best.population) best = city;
  }
  return best;
}

/**
 * Diacritic-insensitive search, best match first: a fully typed Turkish
 * exonym, then a whole-name hit, then a name that starts with the query,
 * then a half-typed exonym, then a name whose later word starts with it
 * ("york" → New York). Within a tier the list's population order decides.
 * Empty query returns nothing.
 */
export function searchCities(query: string, limit = 10): City[] {
  const key = searchKey(query);
  if (key.length === 0 || limit <= 0) return [];
  const entries = load();
  const seen = new Set<number>();
  const out: City[] = [];
  const push = (city: City): void => {
    if (out.length >= limit || seen.has(city.id)) return;
    seen.add(city.id);
    out.push(city);
  };

  const byExonym = exonymCities();
  // A typed exonym is an exact hit and outranks everything.
  for (const [typed, city] of byExonym) if (typed === key) push(city);

  const exact: City[] = [];
  const prefix: City[] = [];
  const word: City[] = [];
  for (const { city, keys, words } of entries) {
    if (keys.includes(key)) exact.push(city);
    else if (keys.some((k) => k.startsWith(key))) prefix.push(city);
    else if (words.some((w) => w.startsWith(key))) word.push(city);
  }
  for (const city of [...exact, ...prefix]) push(city);
  // Half-typed exonyms come after real name matches: "is" must answer
  // İstanbul, not İskenderiye's Turkish name.
  for (const [typed, city] of byExonym) if (typed.startsWith(key)) push(city);
  for (const city of word) push(city);
  return out;
}
