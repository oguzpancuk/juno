import {
  bigThree,
  computeChart,
  starterKey,
  toPublicChart,
  type PublicChart,
} from '@juno/astro';
import { describe, expect, it } from 'vitest';
import type { MatchProfileRow } from './matches';
import { OFFERED, starterOptions } from './starter';

const chartOf = (utc: string, latitude: number, longitude: number) =>
  toPublicChart(computeChart({ utc: new Date(utc), latitude, longitude }));

// Two real charts: the aspects between them are whatever they are, which is
// the point — the ordering rules must hold for a chart nobody chose.
const mine = chartOf('1995-03-14T07:20:00Z', 41.01, 28.98);
const theirs = chartOf('1990-01-17T04:05:00Z', 39.93, 32.86);

const LESSER = '00000000-0000-4000-8000-000000000001';
const GREATER = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

/** A match row for a counterpart with `theirs`, seen from `userId`. */
const rowFor = (
  userId: string,
  chart: PublicChart = theirs,
): MatchProfileRow => {
  const otherId = userId === LESSER ? GREATER : LESSER;
  const [a, b] = userId === LESSER ? [mine, chart] : [chart, mine];
  const key = starterKey(a, b);
  if (!key) throw new Error('the fixtures share no aspect');
  return {
    match_id: '11111111-1111-4111-8111-111111111111',
    starter_key: key,
    matched_at: '2026-09-11T00:00:00Z',
    id: otherId,
    display_name: 'Kaan',
    age: 35,
    gender: 'man',
    big_three: bigThree(chart),
    chart,
    last_body: null,
    last_at: null,
    last_sender_id: null,
    unread_count: 0,
    bio: null,
    photos: [],
  };
};

describe('starterOptions', () => {
  it('offers the stored question alone when the viewer has no chart', () => {
    const options = starterOptions(null, rowFor(LESSER), LESSER);
    expect(options).toHaveLength(1);
  });

  it('leads with the stored question, whichever side the viewer is', () => {
    for (const userId of [LESSER, GREATER]) {
      const row = rowFor(userId);
      const stored = starterOptions(null, row, userId)[0];
      const offered = starterOptions(mine, row, userId)[0];
      expect(offered?.question).toBe(stored?.question);
    }
  });

  it('offers alternatives once the viewer has a chart', () => {
    const options = starterOptions(mine, rowFor(LESSER), LESSER);
    expect(options.length).toBeGreaterThan(1);
    expect(options.length).toBeLessThanOrEqual(OFFERED + 1);
  });

  it('never offers the same question twice', () => {
    const options = starterOptions(mine, rowFor(LESSER), LESSER);
    const questions = options.map((option) => option.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('offers nothing when the stored key is unreadable and there is no chart', () => {
    const row = { ...rowFor(LESSER), starter_key: 'not-a-key' };
    expect(starterOptions(null, row, LESSER)).toHaveLength(0);
  });
});
