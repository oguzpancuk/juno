import { describe, expect, it } from 'vitest';
import { BADGE_CAP, badgeText, totalUnread } from './unread-count';

describe('unread badge', () => {
  it('adds every thread up', () => {
    expect(
      totalUnread([
        { unread_count: 2 },
        { unread_count: 0 },
        { unread_count: 5 },
      ]),
    ).toBe(7);
    expect(totalUnread([])).toBe(0);
  });

  it('adds nothing for a count that is not a count', () => {
    expect(
      totalUnread([
        { unread_count: -3 },
        { unread_count: Number.NaN },
        { unread_count: 1.5 },
        { unread_count: 4 },
      ]),
    ).toBe(4);
  });

  it('shows nothing when nothing is unread', () => {
    expect(badgeText(0)).toBeUndefined();
    expect(badgeText(-1)).toBeUndefined();
    expect(badgeText(Number.NaN)).toBeUndefined();
  });

  it('shows the count, then stops at the cap', () => {
    expect(badgeText(1)).toBe('1');
    expect(badgeText(BADGE_CAP)).toBe('99');
    expect(badgeText(BADGE_CAP + 1)).toBe('99+');
    expect(badgeText(1500)).toBe('99+');
  });
});
