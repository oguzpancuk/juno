import { describe, expect, it } from 'vitest';
import { sunLongitude, sunSign } from './sun';

// Reference longitudes from astro.com (Swiss Ephemeris), apparent geocentric,
// tropical. Tolerance 1° per ADR-0004 (asserted explicitly); the numbers
// are far from sign cusps.
describe('sunSign', () => {
  it('J2000 noon: Sun at ~280.4° Capricorn', () => {
    const utc = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    expect(Math.abs(sunLongitude(utc) - 280.37)).toBeLessThan(1);
    expect(sunSign(utc)).toBe('capricorn');
  });

  it('1995-07-14 00:30 UTC: Sun at ~111.1° Cancer', () => {
    const utc = new Date(Date.UTC(1995, 6, 14, 0, 30, 0));
    expect(Math.abs(sunLongitude(utc) - 111.1)).toBeLessThan(1);
    expect(sunSign(utc)).toBe('cancer');
  });

  it('is deterministic for the same instant', () => {
    const a = new Date(Date.UTC(1990, 0, 1, 12));
    expect(sunLongitude(a)).toBe(sunLongitude(new Date(a.getTime())));
  });
});
