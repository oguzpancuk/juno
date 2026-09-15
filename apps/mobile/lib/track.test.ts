import { describe, expect, it } from 'vitest';
import {
  TRACK_SLOP,
  moveThumb,
  nearerThumb,
  nearestStop,
  optionToWrite,
  readTouch,
  stopAt,
  stopX,
  thumbForDirection,
} from './track';

const W = 300;

describe('filter slider track', () => {
  it('puts the stops evenly from end to end', () => {
    expect(stopX(0, W, 5)).toBe(0);
    expect(stopX(2, W, 5)).toBe(150);
    expect(stopX(4, W, 5)).toBe(300);
  });

  it('reads the nearest stop under a finger', () => {
    expect(stopAt(0, W, 5)).toBe(0);
    expect(stopAt(37, W, 5)).toBe(0);
    expect(stopAt(38, W, 5)).toBe(1);
    expect(stopAt(300, W, 5)).toBe(4);
    // Every age from 18 to 99 is a stop.
    expect(stopAt(150, W, 82)).toBe(41);
  });

  it('holds the end when the finger slides past it', () => {
    expect(stopAt(-80, W, 5)).toBe(0);
    expect(stopAt(900, W, 5)).toBe(4);
    expect(stopX(9, W, 5)).toBe(300);
  });

  it('refuses to place anything on a track that has no size', () => {
    expect(stopAt(120, 0, 5)).toBe(0);
    expect(stopAt(Number.NaN, W, 5)).toBe(0);
    expect(stopX(3, Number.NaN, 5)).toBe(0);
    expect(stopAt(120, W, 1)).toBe(0);
  });

  it('gives a touch to the nearer of two thumbs', () => {
    const range = { low: 10, high: 30 };
    expect(nearerThumb(4, range)).toBe('low');
    expect(nearerThumb(19, range)).toBe('low');
    expect(nearerThumb(21, range)).toBe('high');
    expect(nearerThumb(60, range)).toBe('high');
    // Exactly between: the lower thumb, so a tap there still lands.
    expect(nearerThumb(20, range)).toBe('low');
  });

  it('gives a touch beside a closed range to the thumb on its side', () => {
    const closed = { low: 40, high: 40 };
    expect(nearerThumb(10, closed)).toBe('low');
    expect(nearerThumb(39, closed)).toBe('low');
    expect(nearerThumb(41, closed)).toBe('high');
    expect(nearerThumb(81, closed)).toBe('high');
    expect(nearerThumb(5, { low: 0, high: 0 })).toBe('high');
    expect(nearerThumb(70, { low: 81, high: 81 })).toBe('low');
  });

  it("leaves a touch on a closed range to the finger's first move", () => {
    expect(nearerThumb(12, { low: 12, high: 12 })).toBeNull();
    expect(thumbForDirection(-3)).toBe('low');
    expect(thumbForDirection(3)).toBe('high');
    expect(thumbForDirection(0)).toBeNull();
  });

  it('lets the thumbs meet but never cross', () => {
    const range = { low: 10, high: 30 };
    expect(moveThumb(range, 'low', 25, 82)).toEqual({ low: 25, high: 30 });
    expect(moveThumb(range, 'low', 50, 82)).toEqual({ low: 30, high: 30 });
    expect(moveThumb(range, 'high', 2, 82)).toEqual({ low: 10, high: 10 });
    expect(moveThumb(range, 'high', 200, 82)).toEqual({ low: 10, high: 81 });
  });

  it('reads a touch as a tap until it moves past the slop', () => {
    expect(readTouch(0, 0)).toBeNull();
    expect(readTouch(TRACK_SLOP, 0)).toBeNull();
    expect(readTouch(0, TRACK_SLOP)).toBeNull();
    expect(readTouch(Number.NaN, 0)).toBeNull();
  });

  it('reads a mostly sideways move as a drag, anything else as a scroll', () => {
    expect(readTouch(9, 3)).toBe('drag');
    expect(readTouch(-9, 2)).toBe('drag');
    expect(readTouch(3, 9)).toBe('scroll');
    expect(readTouch(-2, -12)).toBe('scroll');
    // A diagonal is not sideways enough to hold the sheet still.
    expect(readTouch(9, 9)).toBe('scroll');
  });

  it('saves nothing when a thumb is let go where the stored value shows', () => {
    const km = [5, 25, 50, 100, 500] as const;
    // A stored 70 shows at 50: a tap there must not rewrite it.
    expect(optionToWrite(2, 70, km)).toBeNull();
    expect(optionToWrite(3, 70, km)).toBe(100);
    expect(optionToWrite(2, 50, km)).toBeNull();
    expect(optionToWrite(0, 50, km)).toBe(5);
    expect(optionToWrite(9, 50, km)).toBeNull();
  });

  it('shows a stored value that is not an option at the nearest option', () => {
    const km = [5, 25, 50, 100, 500] as const;
    expect(nearestStop(50, km)).toBe(2);
    expect(nearestStop(5, km)).toBe(0);
    expect(nearestStop(70, km)).toBe(2);
    expect(nearestStop(80, km)).toBe(3);
    expect(nearestStop(420, km)).toBe(4);
  });
});
