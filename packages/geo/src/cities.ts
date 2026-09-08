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
 * Diacritic-insensitive search, best match first: Turkish exonym, then a
 * whole-name hit, then a name that starts with the query, then a name
 * whose later word does ("york" → New York). Within a tier the list's
 * population order decides. Empty query returns nothing.
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
  for (const [typed, city] of byExonym) if (typed === key) push(city);
  for (const [typed, city] of byExonym) if (typed.startsWith(key)) push(city);

  const exact: City[] = [];
  const prefix: City[] = [];
  const word: City[] = [];
  for (const { city, keys, words } of entries) {
    if (keys.includes(key)) exact.push(city);
    else if (keys.some((k) => k.startsWith(key))) prefix.push(city);
    else if (words.some((w) => w.startsWith(key))) word.push(city);
  }
  for (const city of [...exact, ...prefix, ...word]) push(city);
  return out;
}
