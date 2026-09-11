import { describe, expect, it } from 'vitest';
import { ageOn } from './age';

/** A calendar day on the UTC calendar, which is the one the DB reads. */
const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d));

describe('ageOn', () => {
  // Every expectation here was read back from the local Postgres 17 on
  // 2026-09-11 with `extract(year from age(<today>, <birth>))`, the
  // expression every view that publishes an age uses (`discover`,
  // `match_profiles`). The point of the function is that the owner's own
  // page shows the number everyone else already sees.

  it('counts the birthday itself', () => {
    expect(ageOn('2000-05-10', utc(2026, 5, 10))).toBe(26);
  });

  it('is one less the day before the birthday', () => {
    expect(ageOn('2000-05-10', utc(2026, 5, 9))).toBe(25);
  });

  it('borrows across the year boundary', () => {
    expect(ageOn('2000-12-31', utc(2026, 1, 1))).toBe(25);
  });

  it('gives a 29 February birth its birthday on 1 March of a common year', () => {
    // Postgres `age()` borrows a whole month when the day difference is
    // negative, so on 28 February the age is still "24 years 11 mons
    // 28 days". The CHECK constraint on birth_date uses interval
    // arithmetic instead (29 Feb − 18 y = 28 Feb) — a different rule, and
    // the one this function must NOT copy.
    expect(ageOn('2000-02-29', utc(2025, 2, 28))).toBe(24);
    expect(ageOn('2000-02-29', utc(2025, 3, 1))).toBe(25);
    expect(ageOn('2000-02-29', utc(2025, 3, 31))).toBe(25);
  });

  it('counts a 29 February birthday on 29 February of a leap year', () => {
    expect(ageOn('2000-02-29', utc(2028, 2, 29))).toBe(28);
  });

  it('reads the UTC calendar, not the device zone', () => {
    // 23:30 UTC on the eve of the birthday: still the day before in UTC,
    // whatever the phone's zone would call it.
    const eve = new Date(Date.UTC(2026, 4, 9, 23, 30));
    expect(ageOn('2000-05-10', eve)).toBe(25);
  });

  it('returns null for a date it cannot read', () => {
    expect(ageOn('', utc(2026, 1, 1))).toBeNull();
    expect(ageOn('2000-13-01', utc(2026, 1, 1))).toBeNull();
    expect(ageOn('2001-02-29', utc(2026, 1, 1))).toBeNull();
    expect(ageOn('10/05/2000', utc(2026, 1, 1))).toBeNull();
  });
});
