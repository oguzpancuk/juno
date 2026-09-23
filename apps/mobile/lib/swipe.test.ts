import { describe, expect, it } from 'vitest';
import {
  claimsCard,
  CLAIM_DISTANCE,
  deckOffset,
  decideSwipe,
  isUpwardGesture,
  FLICK_VELOCITY,
  SUPER_FLOOR,
  UP_BLEND,
  UP_DOMINANCE,
  SUPER_THRESHOLD,
  stampStrength,
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

describe('isUpwardGesture', () => {
  // The deck draws the card with this and decides it with `decideSwipe`,
  // and the two disagreeing is a bug the person pays for: QA found a
  // card drawn as a star, SÜPER stamp at full, that sent a pass and
  // dismissed the person for good (2026-09-23).
  it('is exactly the gesture that can star somebody', () => {
    // 272 up with 140 of left drift: outside the star, so the card must
    // be drawn sideways — and it is a pass, which is what it sends.
    expect(isUpwardGesture(-140, -272)).toBe(false);
    expect(
      decideSwipe({ dx: -140, vx: 0, dy: -272, vy: 0, width, height }),
    ).toBe('pass');
    // The same 272 up with 100 of drift is inside it.
    expect(isUpwardGesture(-100, -272)).toBe(true);
    expect(
      decideSwipe({ dx: -100, vx: 0, dy: -272, vy: 0, width, height }),
    ).toBe('super');
  });

  it('never leaves a star the card was not drawn for', () => {
    // A sweep of the quadrant: anything `decideSwipe` stars, this has to
    // have been true for, or the card lied about what it was doing.
    for (let dx = -300; dx <= 300; dx += 20) {
      for (let dy = -400; dy <= 200; dy += 20) {
        for (const vy of [0, -(FLICK_VELOCITY + 0.2)]) {
          const decision = decideSwipe({ dx, vx: 0, dy, vy, width, height });
          if (decision === 'super')
            expect(isUpwardGesture(dx, dy), `${dx},${dy},${vy}`).toBe(true);
        }
      }
    }
  });

  it('is false for a gesture that has not moved, or is not a number', () => {
    expect(isUpwardGesture(0, 0)).toBe(false);
    expect(isUpwardGesture(Number.NaN, -300)).toBe(false);
  });
});

describe('a gesture the card was drawn as a star for', () => {
  it('answers nothing when it is taken back, rather than passing', () => {
    // QA's third round: drag up past the line, then yank the finger back
    // down and lift. The card is up, the SÜPER stamp is full — and the
    // release used to fall through to the sideways rules, where 122
    // points of left drift is past the threshold, so the person was
    // dismissed for good. Sideways this is a change of mind and answers
    // nothing; upwards it has to mean the same thing.
    expect(
      decideSwipe({ dx: -122, vx: 0, dy: -250, vy: 0.6, width, height }),
    ).toBeNull();
    // The mirror: drifting right, it used to spend a like.
    expect(
      decideSwipe({ dx: 122, vx: 0, dy: -250, vy: 0.6, width, height }),
    ).toBeNull();
  });

  it('is never answered sideways', () => {
    // The card follows the finger up and only a quarter of the way
    // across, so a verdict it never showed must not come out of it.
    for (let dx = -300; dx <= 300; dx += 15) {
      for (let dy = -400; dy <= 0; dy += 15) {
        if (!isUpwardGesture(dx, dy)) continue;
        for (const vx of [0, -1, 1]) {
          for (const vy of [0, -1, 1]) {
            const decision = decideSwipe({ dx, vx, dy, vy, width, height });
            expect(
              decision === 'like' || decision === 'pass',
              `${dx},${dy}`,
            ).toBe(false);
          }
        }
      }
    }
  });
});

describe('deckOffset', () => {
  // The deck draws the card with this, so the drawing is a pure function
  // the tests can hold to the decision (QA, 2026-09-23: the two were
  // separate rules and the card lied about what it would send).
  it('follows the axis the gesture is on, and leans on the other', () => {
    expect(deckOffset(120, 10)).toEqual({ x: 120, y: 2.5, up: false });
    expect(deckOffset(20, -200)).toEqual({ x: 5, y: -200, up: true });
  });

  it('calls a gesture upward exactly when the star can be sent', () => {
    for (let dx = -300; dx <= 300; dx += 15) {
      for (let dy = -400; dy <= 200; dy += 15) {
        const drawn = deckOffset(dx, dy);
        expect(drawn.up, `${dx},${dy}`).toBe(isUpwardGesture(dx, dy));
        // Well away from the line, the whole travel on the gesture's own
        // axis is under the finger. Inside the band the two rules are
        // being mixed, which is the next test's business.
        const band = Math.abs(dx) * UP_BLEND;
        if (Math.abs(-dy - Math.abs(dx) * UP_DOMINANCE) < band) continue;
        expect(drawn.up ? drawn.y : drawn.x).toBe(drawn.up ? dy : dx);
      }
    }
  });

  it('does not jump across the line the star is decided on', () => {
    // The two rules used to meet nowhere: one frame either side of the
    // boundary, a card at (100, -200) leapt 151 points up and 75 left,
    // and a finger held near that angle flickered between the two
    // positions (review, 2026-09-23).
    for (let dx = -300; dx <= 300; dx += 10) {
      const edge = -Math.abs(dx) * UP_DOMINANCE;
      const below = deckOffset(dx, edge + 1);
      const above = deckOffset(dx, edge - 1);
      expect(below.up, `${dx}`).toBe(false);
      expect(above.up, `${dx}`).toBe(true);
      expect(Math.abs(above.x - below.x), `x at ${dx}`).toBeLessThan(6);
      expect(Math.abs(above.y - below.y), `y at ${dx}`).toBeLessThan(6);
    }
  });

  it('keeps a straight drag exactly under the finger', () => {
    // The share of each rule is read off the angle alone, so a finger
    // going one way holds one share the whole way out and the card simply
    // tracks it: never faster than the finger, never backwards.
    for (let dx = -3; dx <= 3; dx += 1) {
      for (let dy = -4; dy <= 1; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        let last = deckOffset(0, 0);
        for (let step = 1; step <= 120; step += 1) {
          const now = deckOffset(dx * step, dy * step);
          const moved = Math.hypot(now.x - last.x, now.y - last.y);
          expect(moved, `${dx},${dy} at ${step}`).toBeLessThanOrEqual(
            Math.hypot(dx, dy) + 1e-9,
          );
          last = now;
        }
      }
    }
  });

  it('never sends the card back against a finger that changed direction', () => {
    // A finger that drags sideways and then turns upward crosses the band,
    // and the card closes the gap as it does. It may lead the finger there
    // — the old code closed that same gap in a single frame — but it never
    // reverses and it never leaps.
    for (let dx = -200; dx <= 200; dx += 25) {
      let last = deckOffset(dx, 60);
      for (let dy = 55; dy >= -600; dy -= 5) {
        const now = deckOffset(dx, dy);
        expect(now.y, `y at ${dx},${dy}`).toBeLessThanOrEqual(last.y);
        expect(Math.abs(now.x), `x at ${dx},${dy}`).toBeLessThanOrEqual(
          Math.abs(last.x) + 1e-9,
        );
        expect(
          Math.abs(now.y - last.y),
          `step at ${dx},${dy}`,
        ).toBeLessThanOrEqual(5 * 2.5);
        last = now;
      }
    }
  });

  it('answers a still card for a gesture that is not a number', () => {
    expect(deckOffset(Number.NaN, -200)).toEqual({ x: 0, y: 0, up: false });
    expect(deckOffset(10, Number.POSITIVE_INFINITY)).toEqual({
      x: 0,
      y: 0,
      up: false,
    });
  });
});

describe('stampStrength', () => {
  // The stamp is the card's promise. Until this test the promise and the
  // verdict were computed from two different numbers — the verdict from
  // the gesture, the stamp from where the blend had drawn the card — and
  // a release inside the blend band counted with its stamp at 63%
  // (review, 2026-09-23).
  const height = 800;

  it('is fully drawn on every release that counts on distance alone', () => {
    const worst = { like: 1, pass: 1, super: 1 };
    let worstAt = '';
    for (let dx = -400; dx <= 400; dx += 1) {
      for (let dy = -400; dy <= 400; dy += 1) {
        const decision = decideSwipe({ dx, vx: 0, dy, vy: 0, width, height });
        if (decision === null) continue;
        const shown = stampStrength(dx, dy, width, height)[decision];
        if (shown < worst[decision]) {
          worst[decision] = shown;
          worstAt = `${decision} at dx=${dx}, dy=${dy}`;
        }
      }
    }
    expect({ ...worst, worstAt }).toEqual({
      like: 1,
      pass: 1,
      super: 1,
      worstAt: '',
    });
  });

  it('never fully draws a stamp the release would contradict', () => {
    // The dangerous direction: a full stamp that lies. A star taken back
    // sending a pass is what this whole file exists to stop. A gesture
    // sitting exactly on its line is drawn in full and sends nothing —
    // the release asks for strictly past it — so `null` is allowed here
    // and only a different verdict is not.
    const lies: string[] = [];
    for (let dx = -400; dx <= 400; dx += 1) {
      for (let dy = -400; dy <= 400; dy += 1) {
        const shown = stampStrength(dx, dy, width, height);
        for (const kind of ['like', 'pass', 'super'] as const) {
          if (shown[kind] < 1) continue;
          const decision = decideSwipe({ dx, vx: 0, dy, vy: 0, width, height });
          if (decision !== null && decision !== kind)
            lies.push(`${kind} drawn at dx=${dx}, dy=${dy}, sends ${decision}`);
        }
      }
    }
    expect(lies).toEqual([]);
  });

  it('draws nothing at all for a gesture that is not a number', () => {
    expect(stampStrength(Number.NaN, -200, width, height)).toEqual({
      like: 0,
      pass: 0,
      super: 0,
    });
    expect(stampStrength(100, -200, 0, height)).toEqual({
      like: 0,
      pass: 0,
      super: 0,
    });
  });
});

describe('claimsCard', () => {
  // The rule that decides whether the card comes under the finger at
  // all. It lived inline in the deck until QA found a finger going up at
  // exactly 45° that satisfied neither of its arms, and a one-character
  // fix shipped with no test at all (2026-09-23).
  it('takes a clearly sideways drag', () => {
    expect(claimsCard(CLAIM_DISTANCE + 1, 0)).toBe(true);
    expect(claimsCard(-(CLAIM_DISTANCE + 1), 4)).toBe(true);
  });

  it('takes an upward drag, including one at exactly 45°', () => {
    expect(claimsCard(0, -(CLAIM_DISTANCE + 1))).toBe(true);
    expect(claimsCard(200, -200)).toBe(true);
    expect(claimsCard(-200, -200)).toBe(true);
  });

  it('leaves a downward drag alone, whatever its angle', () => {
    // Nothing is bound to it, so the card must not follow the finger.
    expect(claimsCard(0, 200)).toBe(false);
    expect(claimsCard(4, 200)).toBe(false);
  });

  it('leaves a touch that has barely moved alone', () => {
    // A tap on the photograph opens the profile, and a tap on the band
    // opens the reading; neither may be eaten by the card.
    expect(claimsCard(CLAIM_DISTANCE, 0)).toBe(false);
    expect(claimsCard(0, -CLAIM_DISTANCE)).toBe(false);
    expect(claimsCard(0, 0)).toBe(false);
  });

  it('is false for a gesture that is not a number', () => {
    expect(claimsCard(Number.NaN, -200)).toBe(false);
  });
});
