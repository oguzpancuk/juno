/**
 * The rule that turns a released drag into a like, a pass or nothing.
 *
 * Pure so it can be tested without React Native: the deck's PanResponder
 * hands it the gesture's final state and animates whatever it answers.
 * Two ways past the line — distance or a flick — and one veto: a card
 * dragged right but let go while moving left (or the reverse) is someone
 * changing their mind, and answers nothing.
 */

/** The fraction of the width a card has to travel to count on its own. */
export const SWIPE_THRESHOLD = 0.3;
/** Points per millisecond: the speed of a flick that counts on its own. */
export const FLICK_VELOCITY = 0.5;

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
  if (!Number.isFinite(dx) || !Number.isFinite(vx) || !(width > 0)) {
    return null;
  }
  if ((dx > 0 && vx < 0) || (dx < 0 && vx > 0)) return null;
  const distance = width * SWIPE_THRESHOLD;
  if (dx > distance || vx > FLICK_VELOCITY) return 'like';
  if (dx < -distance || vx < -FLICK_VELOCITY) return 'pass';
  return null;
}
