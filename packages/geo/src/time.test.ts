import { describe, expect, it } from 'vitest';
import { localToUtc, utcOffsetMinutes } from './time';

const iso = (d: Date) => d.toISOString();

describe('localToUtc · reference charts (packages/astro fixtures)', () => {
  it('İstanbul 1995-07-14 03:30 EEST → 00:30Z', () => {
    const utc = localToUtc(
      { year: 1995, month: 7, day: 14, hour: 3, minute: 30 },
      'Europe/Istanbul',
    );
    expect(iso(utc)).toBe('1995-07-14T00:30:00.000Z');
  });

  it('Ankara 1990-01-01 12:00 EET → 10:00Z', () => {
    const utc = localToUtc(
      { year: 1990, month: 1, day: 1, hour: 12, minute: 0 },
      'Europe/Istanbul',
    );
    expect(iso(utc)).toBe('1990-01-01T10:00:00.000Z');
  });

  it('Helsinki 2001-11-20 18:45 EET → 16:45Z', () => {
    const utc = localToUtc(
      { year: 2001, month: 11, day: 20, hour: 18, minute: 45 },
      'Europe/Helsinki',
    );
    expect(iso(utc)).toBe('2001-11-20T16:45:00.000Z');
  });

  it('Sydney 1988-03-05 07:20 AEDT → 1988-03-04T20:20Z', () => {
    const utc = localToUtc(
      { year: 1988, month: 3, day: 5, hour: 7, minute: 20 },
      'Australia/Sydney',
    );
    expect(iso(utc)).toBe('1988-03-04T20:20:00.000Z');
  });
});

describe('localToUtc · historical rules', () => {
  it('Turkey before the 2016 switch: Dec 2015 noon is EET (+02)', () => {
    const utc = localToUtc(
      { year: 2015, month: 12, day: 1, hour: 12, minute: 0 },
      'Europe/Istanbul',
    );
    expect(iso(utc)).toBe('2015-12-01T10:00:00.000Z');
  });

  it('Turkey after the 2016 switch: Dec 2017 noon is permanent +03', () => {
    const utc = localToUtc(
      { year: 2017, month: 12, day: 1, hour: 12, minute: 0 },
      'Europe/Istanbul',
    );
    expect(iso(utc)).toBe('2017-12-01T09:00:00.000Z');
  });

  it('spring-forward gap uses the pre-transition offset', () => {
    // Istanbul 2015-03-29: 03:00 EET → 04:00 EEST, so 03:30 never happened.
    const utc = localToUtc(
      { year: 2015, month: 3, day: 29, hour: 3, minute: 30 },
      'Europe/Istanbul',
    );
    expect(iso(utc)).toBe('2015-03-29T01:30:00.000Z');
  });

  it('fall-back overlap picks the earlier instant', () => {
    // Istanbul 2015-11-08 (postponed from Oct 25 for the election):
    // 04:00 EEST → 03:00 EET, so 03:30 happened twice; first is EEST.
    const istanbul = localToUtc(
      { year: 2015, month: 11, day: 8, hour: 3, minute: 30 },
      'Europe/Istanbul',
    );
    expect(iso(istanbul)).toBe('2015-11-08T00:30:00.000Z');
    // New York 2015-11-01: 02:00 EDT → 01:00 EST; 01:30 first as EDT (−4).
    const newYork = localToUtc(
      { year: 2015, month: 11, day: 1, hour: 1, minute: 30 },
      'America/New_York',
    );
    expect(iso(newYork)).toBe('2015-11-01T05:30:00.000Z');
  });

  it('handles a zone that skipped a whole day (Samoa 2011)', () => {
    // 2011-12-30 never happened in Apia; the pre-transition offset (−10)
    // applies, which is the same instant as 2011-12-31 (+14).
    const utc = localToUtc(
      { year: 2011, month: 12, day: 30, hour: 12, minute: 0 },
      'Pacific/Apia',
    );
    expect(iso(utc)).toBe('2011-12-30T22:00:00.000Z');
  });

  it('handles a half-hour zone and a midnight wall time', () => {
    expect(
      iso(
        localToUtc(
          { year: 2000, month: 1, day: 1, hour: 0, minute: 0 },
          'Asia/Kolkata',
        ),
      ),
    ).toBe('1999-12-31T18:30:00.000Z');
    expect(
      iso(
        localToUtc(
          { year: 2000, month: 1, day: 1, hour: 0, minute: 0 },
          'Europe/Istanbul',
        ),
      ),
    ).toBe('1999-12-31T22:00:00.000Z');
  });

  it('UTC and a west-of-Greenwich zone', () => {
    expect(
      iso(
        localToUtc({ year: 2000, month: 6, day: 1, hour: 9, minute: 0 }, 'UTC'),
      ),
    ).toBe('2000-06-01T09:00:00.000Z');
    expect(
      iso(
        localToUtc(
          { year: 2000, month: 6, day: 1, hour: 9, minute: 0 },
          'America/New_York',
        ),
      ),
    ).toBe('2000-06-01T13:00:00.000Z');
  });
});

describe('localToUtc · validation', () => {
  const local = { year: 1995, month: 7, day: 14, hour: 3, minute: 30 };

  it('rejects an unknown zone', () => {
    expect(() => localToUtc(local, 'Europe/Byzantium')).toThrow(/time zone/);
  });

  it('rejects an impossible calendar date', () => {
    expect(() => localToUtc({ ...local, month: 2, day: 30 }, 'UTC')).toThrow(
      RangeError,
    );
  });

  it('rejects out-of-range fields', () => {
    expect(() => localToUtc({ ...local, hour: 24 }, 'UTC')).toThrow();
    expect(() => localToUtc({ ...local, year: 1850 }, 'UTC')).toThrow();
  });
});

describe('utcOffsetMinutes', () => {
  it('reports +180 for Istanbul in July 1995 and +120 in January 1990', () => {
    expect(utcOffsetMinutes(Date.UTC(1995, 6, 14), 'Europe/Istanbul')).toBe(
      180,
    );
    expect(utcOffsetMinutes(Date.UTC(1990, 0, 1), 'Europe/Istanbul')).toBe(120);
  });
});
