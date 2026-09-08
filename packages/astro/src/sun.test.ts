import { describe, expect, it } from 'vitest';
import { sunLongitude, sunSign } from './sun.js';

// Reference longitudes from astro.com (Swiss Ephemeris), apparent geocentric,
// tropical. Tolerance 1° per ADR-0004; the numbers are far from cusps.
describe('sunSign', () => {
  it('J2000 noon: Sun at ~280.4° Capricorn', () => {
    const utc = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    expect(sunLongitude(utc)).toBeCloseTo(280.37, 0);
    expect(sunSign(utc)).toBe('capricorn');
  });

  it('1995-07-14 00:30 UTC: Sun at ~111.1° Cancer', () => {
    const utc = new Date(Date.UTC(1995, 6, 14, 0, 30, 0));
    expect(sunLongitude(utc)).toBeCloseTo(111.1, 0);
    expect(sunSign(utc)).toBe('cancer');
  });

  it('is deterministic for the same instant', () => {
    const a = new Date(Date.UTC(1990, 0, 1, 12));
    expect(sunLongitude(a)).toBe(sunLongitude(new Date(a.getTime())));
  });
});
