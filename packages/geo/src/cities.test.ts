import { describe, expect, it } from 'vitest';
import { resolveBirth } from './birth';
import {
  EXONYMS,
  allCities,
  cityAt,
  cityById,
  distanceKm,
  exonymCities,
  searchCities,
  searchKey,
} from './cities';

const ISTANBUL = 745044;
const ANKARA = 323786;

describe('city data', () => {
  it('validates and contains every Turkish province centre we spot-check', () => {
    const cities = allCities();
    expect(cities.length).toBeGreaterThan(5000);
    expect(cityById(ISTANBUL)?.name).toBe('İstanbul');
    expect(cityById(ANKARA)?.name).toBe('Ankara');
    for (const name of ['İzmir', 'Bursa', 'Antalya', 'Diyarbakır', 'Trabzon']) {
      expect(searchCities(name, 1)[0]?.name).toBe(name);
    }
  });

  it('carries an IANA zone Intl accepts for every city', () => {
    const zones = new Set(allCities().map((c) => c.timeZone));
    for (const zone of zones) {
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: zone }),
      ).not.toThrow();
    }
  });

  it('offers no birthplace beyond ±66° latitude (Placidus cap, ADR-0004)', () => {
    for (const city of allCities())
      expect(Math.abs(city.latitude)).toBeLessThanOrEqual(66);
    expect(searchCities('Murmansk', 1)).toEqual([]);
  });

  it('is sorted by population, largest first', () => {
    const pops = allCities().map((c) => c.population);
    for (let i = 1; i < pops.length; i++) {
      expect(pops[i]).toBeLessThanOrEqual(pops[i - 1] ?? Infinity);
    }
  });
});

describe('searchKey', () => {
  it('folds Turkish and other diacritics', () => {
    expect(searchKey('İstanbul')).toBe('istanbul');
    expect(searchKey('ISPARTA')).toBe('isparta');
    expect(searchKey('Şanlıurfa')).toBe('sanliurfa');
    expect(searchKey('Zürich')).toBe('zurich');
    expect(searchKey('  Ağrı ')).toBe('agri');
  });
});

describe('searchCities', () => {
  it('finds Istanbul from Turkish, ASCII and lower-case spellings', () => {
    for (const q of ['İstanbul', 'Istanbul', 'istan', 'ISTANBUL']) {
      expect(searchCities(q, 1)[0]?.id).toBe(ISTANBUL);
    }
  });

  it('ranks an exact match before a larger prefix match', () => {
    // Van (525k) is an exact match; Vancouver (662k) only a prefix match.
    const hits = searchCities('van', 5);
    expect(hits[0]?.name).toBe('Van');
    expect(hits.slice(1).some((c) => c.name === 'Vancouver')).toBe(true);
  });

  it('orders prefix matches by population and honours the limit', () => {
    const hits = searchCities('ank', 5);
    expect(hits[0]?.id).toBe(ANKARA);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it('shows Turkish spellings for cities GeoNames names in ASCII', () => {
    for (const name of ['Ümraniye', 'Batıkent', 'İsparta']) {
      expect(searchCities(name, 1)[0]?.name).toBe(name);
    }
  });

  it('returns nothing for an empty or unknown query', () => {
    expect(searchCities('')).toEqual([]);
    expect(searchCities('   ')).toEqual([]);
    expect(searchCities('xqzv')).toEqual([]);
  });
});

describe('resolveBirth', () => {
  it('turns a city id + wall time into the chart engine input', () => {
    const r = resolveBirth({
      cityId: ISTANBUL,
      local: { year: 1995, month: 7, day: 14, hour: 3, minute: 30 },
    });
    expect(r.utc.toISOString()).toBe('1995-07-14T00:30:00.000Z');
    expect(r.latitude).toBeCloseTo(41.0138, 3);
    expect(r.longitude).toBeCloseTo(28.9497, 3);
    expect(r.timeZone).toBe('Europe/Istanbul');
  });

  it('rejects an unknown city id', () => {
    expect(() =>
      resolveBirth({
        cityId: 1,
        local: { year: 1995, month: 7, day: 14, hour: 3, minute: 30 },
      }),
    ).toThrow(/unknown city/);
  });
});

describe('search ranking', () => {
  it('reaches a city by a later word in its name', () => {
    const york = searchCities('york', 5);
    expect(york.map((c) => c.name)).toContain('New York City');
    // An exact whole-name hit still outranks a word hit.
    expect(york[0]?.name).toBe('York');
    expect(searchCities('angeles', 5).map((c) => c.name)).toContain(
      'Los Angeles',
    );
  });

  it('resolves every Turkish exonym to a real city', () => {
    const resolved = exonymCities();
    const missing = EXONYMS.filter((e) => !resolved.has(searchKey(e.tr))).map(
      (e) => e.tr,
    );
    expect(missing).toEqual([]);
    expect(resolved.size).toBe(EXONYMS.length);
  });

  it('puts the exonym first for the Turkish spelling', () => {
    for (const [typed, expected] of [
      ['Viyana', 'Vienna'],
      ['Londra', 'London'],
      ['Atina', 'Athens'],
      ['Moskova', 'Moscow'],
      ['Zürih', 'Zürich'],
      ['Mekke', 'Makkah'],
      ['Bombay', 'Mumbai'],
    ] as const) {
      expect(searchCities(typed, 3)[0]?.name).toBe(expected);
    }
  });

  it('still answers a plain Turkish city prefix first', () => {
    expect(searchCities('ista', 3)[0]?.name).toBe('İstanbul');
    expect(searchCities('İzmir', 1)[0]?.name).toBe('İzmir');
  });

  it('a fully typed exonym outranks names that merely start with it', () => {
    // "Şam" folds to "sam", which is also the prefix of Samara, Samarkand…
    // Without the exact-exonym tier Damascus falls behind all of them.
    expect(searchCities('sam', 5)[0]?.name).toBe('Damascus');
  });

  it('a half-typed exonym still beats a mid-name word match', () => {
    // "napo" is a prefix of Napoli (Naples) and a word inside Cluj-Napoca.
    const napo = searchCities('napo', 5).map((c) => c.name);
    expect(napo[0]).toBe('Naples');
    expect(napo.indexOf('Cluj-Napoca')).toBeGreaterThan(0);
  });

  it('does not let a half-typed exonym outrank a real name', () => {
    // "is" is a prefix of İskenderiye (Alexandria) and of İstanbul.
    expect(searchCities('is', 5)[0]?.name).toBe('İstanbul');
    // "ka" is a prefix of Kahire (Cairo); a name that really starts with
    // "ka" comes first, ranked by population as usual.
    const ka = searchCities('ka', 5);
    expect(ka[0]?.name).not.toBe('Cairo');
    expect(searchKey(ka[0]?.name ?? '')).toMatch(/^ka/);
    // A half-typed exonym is still reachable, just later.
    expect(searchCities('viya', 5).map((c) => c.name)).toContain('Vienna');
  });

  it('returns nothing for an empty or unmatched query', () => {
    expect(searchCities('', 5)).toEqual([]);
    expect(searchCities('   ', 5)).toEqual([]);
    expect(searchCities('zzzznotacity', 5)).toEqual([]);
  });
});

describe('cityAt', () => {
  it('names the city a point stands in', () => {
    // Sultanahmet, a street corner in Ankara, and Konak in İzmir.
    expect(cityAt(41.0082, 28.9784)?.name).toBe('İstanbul');
    expect(cityAt(39.9334, 32.8597)?.name).toBe('Ankara');
    expect(cityAt(38.4237, 27.1428)?.name).toBe('İzmir');
  });

  it('answers with the city rather than the district it is in', () => {
    // The bundled list holds districts as well as cities, and a district
    // centre is the nearer point: Eminönü (55 548) is 1.2 km from
    // Sultanahmet and the İstanbul entry (15.7 M, 283 times over) is
    // 2.5 km. Someone there is in İstanbul, so a neighbour that far
    // outweighs the nearest record takes it.
    expect(cityAt(41.0082, 28.9784)?.name).not.toBe('Eminönü');
    // The same from the other shore, where Üsküdar (524 452, 30 times
    // under İstanbul) is the near entry.
    expect(cityAt(40.99, 29.03)?.name).toBe('İstanbul');
  });

  it('keeps a city its own name when a neighbour is merely bigger', () => {
    // Gebze's own coordinates. Sancaktepe, an İstanbul district 28 km
    // away, is 489 848 against Gebze's 281 436 — bigger, but nowhere
    // near enough to speak for it. (Sultanbeyli is the nearer İstanbul
    // district at 22 km, and loses to the ratio in the same way.)
    expect(cityAt(40.8028, 29.4307)?.name).toBe('Gebze');
    // Tarsus, with Mersin (537 842 against 350 732) 25 km down the road.
    expect(cityAt(36.9177, 34.8928)?.name).toBe('Tarsus');
    // Yalova, across the gulf from Gebze, and Burdur with İsparta 24 km
    // off: both were answered by the neighbour before the ratio.
    expect(cityAt(40.655, 29.2769)?.name).toBe('Yalova');
    expect(cityAt(37.7203, 30.2908)?.name).toBe('Burdur');
  });

  it('never answers with a city in another country', () => {
    // Shenzhen is 17.5 M against Kowloon's 2.2 M and 27 km away, so the
    // ratio alone would hand a Hong Kong address to mainland China.
    expect(cityAt(22.3167, 114.1833)?.name).toBe('Kowloon');
    // Singapore over Johor Bahru is the same shape across the strait.
    expect(cityAt(1.4655, 103.7578)?.name).toBe('Johor Bahru');
  });

  it('does not reach past its radius for a bigger neighbour', () => {
    // İzmit, where Adapazarı is 39 km away and half as populous again.
    expect(cityAt(40.7654, 29.9408)?.name).toBe('İzmit');
    // Bursa, 92 km from İstanbul across the water.
    expect(cityAt(40.1826, 29.0665)?.name).toBe('Bursa');
  });

  it('says nothing where no city is near', () => {
    // Mid-Atlantic, and the empty quarter of the Sahara: "the city you
    // are in" has no answer there, and the nearest one is not it.
    expect(cityAt(0, -30)).toBeUndefined();
    expect(cityAt(21.5, 21.5)).toBeUndefined();
  });

  it('measures the short way round, not through the numbers', () => {
    // Two points either side of the antimeridian are neighbours. A flat
    // subtraction of the longitudes puts them most of the planet apart,
    // and every radius above would then be read off a nonsense distance.
    expect(distanceKm(0, 179.9, 0, -179.9)).toBeLessThan(30);
    // A sanity pair with a known answer: İstanbul to Ankara is ~350 km.
    expect(distanceKm(41.0082, 28.9784, 39.9334, 32.8597)).toBeGreaterThan(330);
    expect(distanceKm(41.0082, 28.9784, 39.9334, 32.8597)).toBeLessThan(370);
  });
});
