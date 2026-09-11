/**
 * The rule that turns a released drag into a like, a pass or nothing.
 *
 * Pure so it can be tested without React Native: the deck's PanResponder
 * hands it the gesture's final state and animates whatever it answers.
 * Two ways past the line — distance or a flick — and one veto: a card
 * dragged right but let go while clearly moving left (or the reverse) is
 * someone changing their mind, and answers nothing.
 */

/** The fraction of the width a card has to travel to count on its own. */
export const SWIPE_THRESHOLD = 0.3;
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

export type SwipeDecision = 'like' | 'pass' | null;

export function decideSwipe({
  dx,
  vx,
  width,
}: {
  /** Horizontal travel since the card was claimed, in points. */
  readonly dx: number;
  /** Horizontal velocity at release, in points per millisecond. */
  readonly vx: number;
  /** The width the threshold is a fraction of. */
  readonly width: number;
}): SwipeDecision {
  // A gesture is internal, not an external boundary, but a width that has
  // not been laid out yet would make every touch a like.
  if (!Number.isFinite(dx) || !(width > 0)) return null;
  // A velocity the platform could not compute (one move event, dt of 0)
  // is no velocity: the distance decides.
  const velocity = Number.isFinite(vx) ? vx : 0;
  const opposes =
    Math.abs(velocity) > VETO_VELOCITY &&
    Math.sign(velocity) === -Math.sign(dx);
  if (opposes) return null;
  const distance = width * SWIPE_THRESHOLD;
  if (dx > distance || velocity > FLICK_VELOCITY) return 'like';
  if (dx < -distance || velocity < -FLICK_VELOCITY) return 'pass';
  return null;
}
