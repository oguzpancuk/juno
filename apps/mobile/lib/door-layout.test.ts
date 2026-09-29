import { describe, expect, it } from 'vitest';
import { doorSize } from './door-layout';

describe('doorSize', () => {
  it("is the compact door on the owner's Safari page, 665 points tall", () => {
    // docs/NOTES.md, 2026-09-21: innerHeight 665 on a 402 x 874 iPhone.
    const size = doorSize(665);
    expect(size.mark).toBeLessThanOrEqual(104);
    expect(size.bottom).toBe(12);
  });

  it('is the door as drawn once there is room for it', () => {
    expect(doorSize(860)).toEqual({
      mark: 132,
      wordmark: 46,
      gap: 12,
      leading: 34,
      top: 24,
      bottom: 48,
      horizonRise: 0.05,
    });
    expect(doorSize(1200)).toEqual(doorSize(860));
  });

  it('grows with the room in between, never shrinking as it grows', () => {
    let was = doorSize(600);
    for (let room = 610; room <= 900; room += 10) {
      const now = doorSize(room);
      expect(now.mark).toBeGreaterThanOrEqual(was.mark);
      expect(now.bottom).toBeGreaterThanOrEqual(was.bottom);
      expect(now.horizonRise).toBeGreaterThanOrEqual(was.horizonRise);
      was = now;
    }
    const middle = doorSize(760);
    expect(middle.mark).toBeGreaterThan(104);
    expect(middle.mark).toBeLessThan(132);
  });

  it('takes a room it cannot read as the compact door, not a broken one', () => {
    expect(doorSize(Number.NaN)).toEqual(doorSize(0));
    expect(doorSize(0).mark).toBe(104);
  });
});
