/**
 * The rule that turns a released drag into a like, a pass, a super like
 * or nothing.
 *
 * Pure so it can be tested without React Native: the deck's PanResponder
 * hands it the gesture's final state and animates whatever it answers.
 * Two ways past the line — distance or a flick — and one veto: a card
 * dragged right but let go while clearly moving left (or the reverse) is
 * someone changing their mind, and answers nothing.
 *
 * Up is the star (owner, 2026-09-23: "yukari dogru kaydirildiginda
 * superlike atmis olsun"), and it plays by those same two rules on the
 * other axis. Down is nothing: no gesture is bound to it, and a card
 * pulled down must not star the person by accident.
 */

/** The fraction of the width a card has to travel to count on its own. */
export const SWIPE_THRESHOLD = 0.3;
/**
 * The same, upwards, as a fraction of the height. Smaller than the
 * sideways share because the screen is twice as tall: on a 390x844 phone
 * this is 127 points against the sideways 117, so the two gestures ask
 * for about the same finger.
 */
export const SUPER_THRESHOLD = 0.15;
/**
 * The least upward travel a flick may star somebody on, as a fraction of
 * the height: 42 points on a 390x844 phone. Sideways has no such floor,
 * because a wrong pass costs one card and a wrong star costs one of the
 * five in the week — and the card is claimed after eight points, so
 * without this a tap with a twitch in it reached the most expensive
 * thing on the screen (QA, 2026-09-23).
 */
export const SUPER_FLOOR = 0.05;
/**
 * How much more upward than sideways a diagonal has to be. A card flung
 * up and away to the left travels more vertically than horizontally
 * while plainly being a dismissal, and it used to star the person being
 * dismissed (QA, 2026-09-23). At twice the sideways travel the gesture
 * reads as deliberate, and everything below that falls through to the
 * sideways rules, veto included.
 */
export const UP_DOMINANCE = 2;
/** Points per millisecond: the speed of a flick that counts on its own. */
export const FLICK_VELOCITY = 0.5;
/**
 * Below this an opposing velocity is noise, not a change of mind. RN's
 * `vx` is the last move event's instantaneous speed, and a finger lifting
 * after a clear drag past the line often carries a few hundredths the
 * other way; vetoing on that sprang the card back from a swipe the person
 * had plainly made.
 */
export const VETO_VELOCITY = 0.15;

export type SwipeDecision = 'like' | 'pass' | 'super' | null;

export function decideSwipe({
  dx,
  vx,
  dy = 0,
  vy = 0,
  width,
  height = 0,
}: {
  /** Horizontal travel since the card was claimed, in points. */
  readonly dx: number;
  /** Horizontal velocity at release, in points per millisecond. */
  readonly vx: number;
  /** Vertical travel, negative upwards, in points. */
  readonly dy?: number;
  /** Vertical velocity at release, negative upwards. */
  readonly vy?: number;
  /** The width the threshold is a fraction of. */
  readonly width: number;
  /**
   * The height the upward threshold is a fraction of. Left out — as
   * every caller did before the star — no upward travel can decide
   * anything, which is what keeps the old three-argument call honest.
   */
  readonly height?: number;
}): SwipeDecision {
  // A gesture is internal, not an external boundary, but a width that has
  // not been laid out yet would make every touch a like.
  if (!Number.isFinite(dx) || !(width > 0)) return null;
  // A velocity the platform could not compute (one move event, dt of 0)
  // is no velocity: the distance decides.
  const velocity = Number.isFinite(vx) ? vx : 0;
  const up = decideUp({ dx, dy, vy, height });
  if (up !== null) return up;
  const opposes =
    Math.abs(velocity) > VETO_VELOCITY &&
    Math.sign(velocity) === -Math.sign(dx);
  if (opposes) return null;
  const distance = width * SWIPE_THRESHOLD;
  if (dx > distance || velocity > FLICK_VELOCITY) return 'like';
  if (dx < -distance || velocity < -FLICK_VELOCITY) return 'pass';
  return null;
}

/**
 * The upward half, asked first by `decideSwipe` and only when the finger
 * meant the vertical axis more than the horizontal one: a diagonal
 * belongs to whichever travel is larger, so neither gesture can be
 * triggered by the other's slop.
 */
function decideUp({
  dx,
  dy,
  vy,
  height,
}: {
  readonly dx: number;
  readonly dy: number;
  readonly vy: number;
  readonly height: number;
}): SwipeDecision {
  if (!Number.isFinite(dy) || !(height > 0)) return null;
  // Upward, and clearly so. `-dy` rather than its size: a card that
  // travelled *down* fails this line, whatever it was doing at the
  // moment it was let go, which is the hole the flick arm below used to
  // leave open.
  if (-dy <= Math.abs(dx) * UP_DOMINANCE) return null;
  const velocity = Number.isFinite(vy) ? vy : 0;
  // Let go while coming back down: a change of mind, as sideways.
  if (velocity > VETO_VELOCITY) return null;
  if (-dy > height * SUPER_THRESHOLD) return 'super';
  // A flick still counts short of the line, but not from nowhere.
  if (velocity < -FLICK_VELOCITY && -dy > height * SUPER_FLOOR) return 'super';
  return null;
}
