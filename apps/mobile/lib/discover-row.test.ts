import { describe, expect, it } from 'vitest';
import { bigThree, computeChart, toPublicChart } from '@juno/astro';
import { DiscoverRowSchema } from './discover-row';

/**
 * A real chart rather than a hand-written one: the schema checks the
 * whole shape, and a fixture that drifts from it fails for a reason that
 * has nothing to do with what is being tested here.
 */
const chart = toPublicChart(
  computeChart({
    utc: new Date('1995-06-14T09:30:00.000Z'),
    latitude: 41.0082,
    longitude: 28.9784,
  }),
);

/** The smallest row the schema accepts, without the badge column. */
const row = {
  id: '22222222-2222-4222-8222-222222222222',
  display_name: 'Selin',
  age: 29,
  gender: 'woman',
  big_three: bigThree(chart),
  chart,
  distance_km: 3,
  bio: 'Kitapçılarda kaybolurum.',
  photos: ['a.jpg'],
};

const parse = (likes_me: unknown): unknown =>
  DiscoverRowSchema.parse({ ...row, likes_me }).likes_me;

describe('DiscoverRowSchema.likes_me', () => {
  it('carries the two answers the view can send', () => {
    expect(parse('like')).toBe('like');
    expect(parse('super')).toBe('super');
  });

  it('is null for a free member, whom the view tells nothing', () => {
    expect(parse(null)).toBe(null);
  });

  it('is null, and keeps the card, for anything else', () => {
    // The rows are parsed one at a time, so a strict enum here would
    // take the whole person off the deck over a decoration: a column
    // this build does not know is a card without a badge.
    expect(parse('adored')).toBe(null);
    expect(parse(7)).toBe(null);
    // A server that has not run the migration sends no column at all.
    expect(DiscoverRowSchema.parse(row).likes_me).toBe(null);
  });
});
