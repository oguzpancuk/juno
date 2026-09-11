import { describe, expect, it } from 'vitest';
import { decideSwipe, FLICK_VELOCITY, SWIPE_THRESHOLD } from './swipe';

/** A phone: the threshold is 120 points. */
const width = 400;
const past = width * SWIPE_THRESHOLD + 10;
const short = width * SWIPE_THRESHOLD - 20;
const flick = FLICK_VELOCITY + 0.3;
const slow = FLICK_VELOCITY - 0.2;

describe('decideSwipe', () => {
  it('likes a card dragged past the threshold', () => {
    expect(decideSwipe({ dx: past, vx: 0, width })).toBe('like');
    expect(decideSwipe({ dx: past, vx: slow, width })).toBe('like');
  });

  it('likes a rightward flick that stopped short of the threshold', () => {
    expect(decideSwipe({ dx: short, vx: flick, width })).toBe('like');
  });

  it('passes symmetrically', () => {
    expect(decideSwipe({ dx: -past, vx: 0, width })).toBe('pass');
    expect(decideSwipe({ dx: -past, vx: -slow, width })).toBe('pass');
    expect(decideSwipe({ dx: -short, vx: -flick, width })).toBe('pass');
  });

  it('answers nothing below both the distance and the speed', () => {
    expect(decideSwipe({ dx: short, vx: slow, width })).toBeNull();
    expect(decideSwipe({ dx: -short, vx: -slow, width })).toBeNull();
    expect(decideSwipe({ dx: 0, vx: 0, width })).toBeNull();
  });

  it('answers nothing when the drag and the release disagree', () => {
    // Dragged right, let go while moving back left: a change of mind, even
    // past the line or at flick speed.
    expect(decideSwipe({ dx: past, vx: -slow, width })).toBeNull();
    expect(decideSwipe({ dx: short, vx: -flick, width })).toBeNull();
    expect(decideSwipe({ dx: -past, vx: slow, width })).toBeNull();
    expect(decideSwipe({ dx: -short, vx: flick, width })).toBeNull();
  });

  it('scales the threshold with the width', () => {
    const dx = 130;
    expect(decideSwipe({ dx, vx: 0, width: 400 })).toBe('like');
    expect(decideSwipe({ dx, vx: 0, width: 500 })).toBeNull();
    // Exactly on the line is not past it.
    expect(
      decideSwipe({ dx: 400 * SWIPE_THRESHOLD, vx: 0, width: 400 }),
    ).toBeNull();
  });

  it('answers nothing for a width that has not been laid out', () => {
    expect(decideSwipe({ dx: past, vx: flick, width: 0 })).toBeNull();
    expect(decideSwipe({ dx: Number.NaN, vx: 0, width })).toBeNull();
  });
});
