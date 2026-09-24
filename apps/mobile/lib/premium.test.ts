import { describe, expect, it } from 'vitest';
import {
  FREE_DAILY_LIKES,
  LIKE_WINDOW_HOURS,
  SUPER_LIKES_PER_WEEK,
  SUPER_WINDOW_HOURS,
  admirerOf,
  daysSince,
  left,
  orderAdmirers,
  orderCandidates,
  quotaRefusal,
  windowStart,
  type LikedMeFields,
} from './premium-rules';

/**
 * The membership's own arithmetic: what a counter shows, what an order
 * puts first, and which refusal a message names. The quotas themselves
 * are the database's and are driven by `supabase/tests/premium.test.ts`.
 */
describe('the quotas as the app reads them', () => {
  it('holds the numbers the migration enforces', () => {
    // Change one and the other has to agree: 20260921000002_premium.sql
    // raises on the 21st like of a day and the 6th star of a week.
    expect(FREE_DAILY_LIKES).toBe(20);
    expect(SUPER_LIKES_PER_WEEK).toBe(5);
    expect(LIKE_WINDOW_HOURS).toBe(24);
    expect(SUPER_WINDOW_HOURS).toBe(7 * 24);
  });

  it('never shows a negative remainder', () => {
    expect(left(0, FREE_DAILY_LIKES)).toBe(20);
    expect(left(20, FREE_DAILY_LIKES)).toBe(0);
    // A server that counted more than the cap — a limit lowered under a
    // spent day — must not put "-3 beğeni" under the deck.
    expect(left(23, FREE_DAILY_LIKES)).toBe(0);
  });

  it('asks for the start of the rolling window, not of the day', () => {
    const now = new Date('2026-09-21T10:00:00.000Z');
    expect(windowStart(LIKE_WINDOW_HOURS, now)).toBe(
      '2026-09-20T10:00:00.000Z',
    );
    expect(windowStart(SUPER_WINDOW_HOURS, now)).toBe(
      '2026-09-14T10:00:00.000Z',
    );
  });
});

describe('reading the database’s refusal', () => {
  const refusal = (message: string) => ({ code: '23514', message });

  it('names which quota was spent', () => {
    expect(quotaRefusal(refusal('daily like quota spent'))).toBe('daily');
    expect(quotaRefusal(refusal('super like quota spent'))).toBe('super-spent');
    expect(quotaRefusal(refusal('super like needs premium'))).toBe(
      'super-premium',
    );
  });

  it('leaves every other refusal alone', () => {
    expect(quotaRefusal(null)).toBeNull();
    // Another check on the same table — the starter key's, or the
    // super-is-a-like constraint — is not a quota and must reach the
    // generic path.
    expect(quotaRefusal(refusal('likes_super_is_a_like'))).toBeNull();
    // The right words under the wrong code: a 23505 is "already swiped".
    expect(
      quotaRefusal({ code: '23505', message: 'daily like quota spent' }),
    ).toBeNull();
  });
});

describe('the deck’s order', () => {
  const card = (score: number, distance_km: number) => ({
    match: { score },
    row: { distance_km },
  });

  it('puts the nearest first for a free member', () => {
    const deck = [card(90, 40), card(50, 2), card(70, 11)];
    expect(
      orderCandidates(deck, 'distance').map((c) => c.row.distance_km),
    ).toEqual([2, 11, 40]);
  });

  it('puts the best match first for a premium member', () => {
    const deck = [card(50, 2), card(90, 40), card(70, 11)];
    expect(
      orderCandidates(deck, 'compatibility').map((c) => c.match.score),
    ).toEqual([90, 70, 50]);
  });

  it('breaks a tie with the other measure, both ways round', () => {
    const deck = [card(70, 30), card(70, 4)];
    expect(
      orderCandidates(deck, 'compatibility').map((c) => c.row.distance_km),
    ).toEqual([4, 30]);
    const same = [card(40, 12), card(88, 12)];
    expect(orderCandidates(same, 'distance').map((c) => c.match.score)).toEqual(
      [88, 40],
    );
  });

  it('leaves the deck it was given alone', () => {
    const deck = [card(50, 2), card(90, 40)];
    orderCandidates(deck, 'compatibility');
    expect(deck.map((c) => c.match.score)).toEqual([50, 90]);
  });
});

describe('who liked you', () => {
  const row = (over: Partial<LikedMeFields> = {}): LikedMeFields => ({
    id: '11111111-1111-4111-8111-111111111111',
    display_name: 'Derya',
    age: 29,
    gender: 'woman',
    big_three: { sun: 'cancer', moon: 'aquarius', rising: 'gemini' },
    chart: {
      version: 1,
      planets: {},
      houses: { ascendant: 0, mc: 270, cusps: [] },
    } as unknown as LikedMeFields['chart'],
    bio: null,
    photos: ['a/1.png'],
    height_cm: null,
    interests: [],
    university: null,
    occupation: null,
    distance_km: 4,
    is_super: false,
    liked_at: '2026-09-20T08:00:00.000Z',
    ...over,
  });

  it('reads the person out of a premium row', () => {
    const person = admirerOf(row());
    expect(person?.display_name).toBe('Derya');
    expect(person?.photos).toEqual(['a/1.png']);
    // The distance comes with them, because the list hands the deck a
    // card and a card says how far away somebody is.
    expect(person?.distance_km).toBe(4);
  });

  it('carries the four profile details onto the card', () => {
    // The card a tap opens draws the same rows under the name as the
    // deck's own, so a person read off this list must bring them along.
    const person = admirerOf(
      row({
        height_cm: 172,
        interests: ['music', 'cats'],
        university: 'Boğaziçi Üniversitesi',
        occupation: 'Mimar',
      }),
    );
    expect(person?.height_cm).toBe(172);
    expect(person?.interests).toEqual(['music', 'cats']);
    expect(person?.university).toBe('Boğaziçi Üniversitesi');
    expect(person?.occupation).toBe('Mimar');
  });

  it('withholds the person when the view withheld the columns', () => {
    // What a free member's row looks like: the star and the day, and
    // nothing that says who.
    expect(
      admirerOf(
        row({
          id: null,
          display_name: null,
          age: null,
          gender: null,
          big_three: null,
          chart: null,
          bio: null,
          photos: null,
          height_cm: null,
          interests: null,
          university: null,
          occupation: null,
          distance_km: null,
        }),
      ),
    ).toBeNull();
    // A row missing one column is withheld too, rather than drawn half.
    expect(admirerOf(row({ photos: null }))).toBeNull();
    expect(admirerOf(row({ distance_km: null }))).toBeNull();
    // A profile always has a list of interests, if an empty one; null is
    // the view withholding it.
    expect(admirerOf(row({ interests: null }))).toBeNull();
  });

  it('puts the stars first, then the newest', () => {
    const list = [
      row({ is_super: false, liked_at: '2026-09-19T08:00:00.000Z' }),
      row({ is_super: true, liked_at: '2026-09-15T08:00:00.000Z' }),
      row({ is_super: false, liked_at: '2026-09-21T08:00:00.000Z' }),
    ];
    expect(
      orderAdmirers(list).map((r) => [r.is_super, r.liked_at.slice(8, 10)]),
    ).toEqual([
      [true, '15'],
      [false, '21'],
      [false, '19'],
    ]);
  });

  it('counts calendar days back, and nothing forward', () => {
    // Local times on purpose: the words are the reader's calendar, so the
    // test must read the same in any timezone the runner is set to.
    const at = (day: number, hour: number) => new Date(2026, 8, day, hour);
    const now = at(21, 8);
    expect(daysSince(at(21, 2).toISOString(), now)).toBe(0);
    // Last night at 23:30 is "Dün", though it is under nine hours ago.
    expect(daysSince(at(20, 23).toISOString(), now)).toBe(1);
    // Yesterday morning is "Dün" too, though it is 23 hours ago.
    expect(daysSince(at(20, 9).toISOString(), now)).toBe(1);
    expect(daysSince(at(14, 9).toISOString(), now)).toBe(7);
    // A clock behind the server's must not read as "-1 gün önce".
    expect(daysSince(at(22, 1).toISOString(), now)).toBe(0);
    expect(daysSince('not a time', now)).toBe(0);
  });
});
