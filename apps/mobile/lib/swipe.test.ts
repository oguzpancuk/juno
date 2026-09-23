import { describe, expect, it } from 'vitest';
import {
  decideSwipe,
  FLICK_VELOCITY,
  SUPER_FLOOR,
  SUPER_THRESHOLD,
  SWIPE_THRESHOLD,
  VETO_VELOCITY,
} from './swipe';

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

  it('ignores an opposing velocity too small to be a change of mind', () => {
    // A lift after a clear drag past the line carries a few hundredths the
    // other way from the last move event; that is the finger leaving, and
    // the distance decides.
    expect(decideSwipe({ dx: past, vx: -0.05, width })).toBe('like');
    expect(decideSwipe({ dx: -past, vx: 0.05, width })).toBe('pass');
    expect(decideSwipe({ dx: past, vx: -VETO_VELOCITY, width })).toBe('like');
    expect(decideSwipe({ dx: past, vx: -(VETO_VELOCITY + 0.01), width })).toBe(
      null,
    );
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

  it('answers nothing for a width or a distance that is not a number', () => {
    expect(decideSwipe({ dx: past, vx: flick, width: 0 })).toBeNull();
    expect(decideSwipe({ dx: Number.NaN, vx: 0, width })).toBeNull();
  });

  it('decides on distance alone when the velocity is not a number', () => {
    // One move event and a dt of zero: the platform divides by it.
    expect(decideSwipe({ dx: past, vx: Number.NaN, width })).toBe('like');
    expect(decideSwipe({ dx: short, vx: Number.NaN, width })).toBeNull();
  });
});

/** The same phone, upright: the super threshold is 126 points. */
const height = 844;
const upPast = -(height * SUPER_THRESHOLD + 10);
const upShort = -(height * SUPER_THRESHOLD - 20);

describe('decideSwipe, upwards', () => {
  it('super likes a card dragged up past the threshold', () => {
    expect(
      decideSwipe({ dx: 0, vx: 0, dy: upPast, vy: 0, width, height }),
    ).toBe('super');
  });

  it('super likes an upward flick that stopped short of the threshold', () => {
    expect(
      decideSwipe({ dx: 0, vx: 0, dy: upShort, vy: -flick, width, height }),
    ).toBe('super');
  });

  it('answers nothing for a drag downwards, however far', () => {
    // Nothing is bound to it, and a card pulled down must not star anyone.
    expect(
      decideSwipe({ dx: 0, vx: 0, dy: -upPast, vy: 0, width, height }),
    ).toBeNull();
    expect(
      decideSwipe({ dx: 0, vx: 0, dy: -upShort, vy: flick, width, height }),
    ).toBeNull();
  });

  it('wants a diagonal to be clearly upward, not merely more upward', () => {
    // A card flung up and away to the left is a dismissal with an arc in
    // it, and it used to star the person being dismissed (QA,
    // 2026-09-23). The star now asks for twice the sideways travel.
    expect(
      decideSwipe({ dx: -150, vx: 0, dy: -200, vy: 0, width, height }),
    ).toBe('pass');
    expect(decideSwipe({ dx: 40, vx: 0, dy: -200, vy: 0, width, height })).toBe(
      'super',
    );
    // Mostly sideways is still the verdict it looks like.
    expect(
      decideSwipe({ dx: past, vx: 0, dy: upShort, vy: 0, width, height }),
    ).toBe('like');
  });

  it('never stars a card that travelled downwards', () => {
    // The hole QA found: the flick arm did not look at where the card
    // actually was. Dragged down 300 points and released with the finger
    // snapping back up, this sent a super like — the most expensive
    // thing on the screen — with no stamp ever shown.
    expect(
      decideSwipe({ dx: 20, vx: 0, dy: 300, vy: -0.6, width, height }),
    ).toBeNull();
  });

  it('asks a flick for some travel before it stars anybody', () => {
    // Ten points up off the photograph is a tap with a twitch in it, and
    // the card is claimed at eight. A wrong pass costs a card; a wrong
    // star costs one of five in the week.
    expect(
      decideSwipe({ dx: 9, vx: 0, dy: -10, vy: -flick, width, height }),
    ).toBeNull();
    expect(
      decideSwipe({
        dx: 0,
        vx: 0,
        dy: -(height * SUPER_FLOOR + 5),
        vy: -flick,
        width,
        height,
      }),
    ).toBe('super');
  });

  it('keeps the change-of-mind veto that sideways has', () => {
    // Past the sideways line, let go moving left, with a drift upwards:
    // the star used to answer before the veto was ever asked.
    expect(
      decideSwipe({ dx: 200, vx: -0.6, dy: -250, vy: 0, width, height }),
    ).toBeNull();
  });

  it('answers nothing when the drag and the release disagree', () => {
    // Dragged up, let go while coming back down: a change of mind.
    expect(
      decideSwipe({ dx: 0, vx: 0, dy: upPast, vy: slow, width, height }),
    ).toBeNull();
  });

  it('still decides the old way when nothing vertical is given', () => {
    // Every caller before the star passed three arguments, and a missing
    // height cannot make an upward gesture out of them.
    expect(decideSwipe({ dx: past, vx: 0, width })).toBe('like');
    expect(decideSwipe({ dx: 0, vx: 0, dy: upPast, vy: 0, width })).toBeNull();
  });
});
