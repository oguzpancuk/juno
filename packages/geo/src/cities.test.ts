import { describe, expect, it } from 'vitest';
import { resolveBirth } from './birth';
import { allCities, cityById, searchCities, searchKey } from './cities';

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
