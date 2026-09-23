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
/**
 * How much of the *other* axis the card follows while a gesture is being
 * made: enough to feel held, not so much that a wobble looks like an
 * answer. Here rather than on the deck because `deckOffset` below is
 * what draws with it.
 */
export const CROSS_FOLLOW = 0.25;
/**
 * The band over which the card changes from being drawn as a sideways
 * gesture to being drawn as a star, as a share of the sideways travel.
 * Without it the two rules met nowhere: one frame either side of the 2:1
 * line a card at (100, -200) leapt 151 points up and 75 left, and a
 * finger held near that angle flickered between the two positions
 * (review, 2026-09-23).
 *
 * A share rather than a number of points because the gap between the two
 * rules is itself proportional — three quarters of each axis' travel —
 * so a fixed band would be gentle on a small gesture and a lurch on a
 * large one.
 *
 * The share is read off the angle, so a straight drag holds one share
 * for its whole length however deep in the band it is: the card sits at
 * a fixed fraction of the finger's travel and never moves faster than
 * the finger. It does not sit *under* the finger — a straight drag
 * between about 51° and 70° is inside the band the whole way, and at
 * (100, -200) the card is drawn at (62.5, -125), 84 points behind
 * (review, 2026-09-23). Only a finger that turns mid-gesture crosses the
 * band, and there the card is closing a gap rather than tracking —
 * measured at about twice the finger's rate, against the single
 * 151-point frame this replaced (QA, 2026-09-23).
 *
 * The decision does not blend: the star is still the 2:1 line exactly.
 * Neither do the stamps, which are drawn from the gesture itself
 * (`stampStrength`) for that reason. Only the picture does.
 */
export const UP_BLEND = 0.75;
/**
 * How far a finger travels before the card comes under it. A tap on the
 * photograph opens the profile and a tap on the band opens the reading,
 * so the card may not take a touch that has barely moved.
 */
export const CLAIM_DISTANCE = 8;
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

/**
 * Whether a gesture is going upwards — the star's one predicate, and the
 * only place the 2:1 rule is written.
 *
 * Exported because the deck draws with it as well as deciding with it.
 * When the two disagreed, a card 272 points up and 140 left was drawn as
 * a star, SÜPER stamp at full opacity, and sent a pass: the person was
 * dismissed for good, and there is no undo anywhere in the app (QA,
 * 2026-09-23). One predicate, read by the drawing and by the decision,
 * is what keeps the card from lying about what it is about to do.
 */
/**
 * Where the card sits under a finger, and which gesture it is being
 * drawn as. The deck's move handler is one call to this, so the picture
 * and the verdict cannot be two rules that drift apart — which is what
 * they were, and the card then showed a star and sent a pass (QA,
 * 2026-09-23).
 */
export function deckOffset(
  dx: number,
  dy: number,
): { x: number; y: number; up: boolean } {
  if (!Number.isFinite(dx) || !Number.isFinite(dy))
    return { x: 0, y: 0, up: false };
  // How far past the 2:1 line the gesture is, in points: negative below
  // it, zero on it. `UP_BLEND` either side of that is where the card is
  // drawn as a mixture of the two, so that no frame moves it on its own.
  const past = -dy - Math.abs(dx) * UP_DOMINANCE;
  const band = Math.abs(dx) * UP_BLEND;
  const star =
    past <= -band ? 0 : past >= band ? 1 : (past + band) / (2 * band);
  const follow = (side: number, starward: number): number =>
    side + (starward - side) * star;
  return {
    x: dx * follow(1, CROSS_FOLLOW),
    y: dy * follow(CROSS_FOLLOW, 1),
    up: isUpwardGesture(dx, dy),
  };
}

/**
 * How fully each stamp is drawn while a finger is still down.
 *
 * The deck draws these with `Animated.interpolate`, so that they can run
 * on the UI thread; this is the same rule written once, where a test can
 * hold it against `decideSwipe`. The two have to agree: a release that
 * counts with its stamp part-drawn spends one of five weekly stars on a
 * gesture the card never showed the person it had committed to.
 */
export function stampStrength(
  dx: number,
  dy: number,
  width: number,
  height: number,
): { like: number; pass: number; super: number } {
  const none = { like: 0, pass: 0, super: 0 };
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !(width > 0)) return none;
  const clamp = (share: number): number =>
    share < 0 ? 0 : share > 1 ? 1 : share;
  // The gesture itself, not where `deckOffset` drew the card: the blend
  // that keeps the picture continuous also holds the card back, and a
  // stamp that followed it read 0.63 on a release that sent SÜPER
  // (review, 2026-09-23).
  const up = isUpwardGesture(dx, dy);
  // A star's gesture draws no sideways stamp at all, for the same reason
  // `decideSwipe` never hands one to the sideways arms. Without this a
  // card 300 left and 700 up drew PASS in full and sent SÜPER.
  const across = up ? 0 : dx / (width * SWIPE_THRESHOLD);
  return {
    like: clamp(across),
    pass: clamp(-across),
    super: up && height > 0 ? clamp(-dy / (height * SUPER_THRESHOLD)) : 0,
  };
}

export function isUpwardGesture(dx: number, dy: number): boolean {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  // `-dy`, not its size: a card that travelled down fails this outright.
  return -dy > Math.abs(dx) * UP_DOMINANCE;
}

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
  // A gesture drawn as a star is answered as one or not at all. It is
  // never handed to the sideways arms below: the card followed the
  // finger upwards and only a quarter of the way across, so a verdict
  // it never showed must not come out of it — least of all a pass,
  // which is permanent and which is exactly what a star taken back used
  // to send (QA, 2026-09-23).
  if (isUpwardGesture(dx, dy)) return decideUp({ dy, vy, height });
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

/**
 * The star, or nothing. Asked by `decideSwipe` for every gesture
 * `isUpwardGesture` is true of, and for no other, so what it answers is
 * the whole answer for that gesture.
 */
function decideUp({
  dy,
  vy,
  height,
}: {
  readonly dy: number;
  readonly vy: number;
  readonly height: number;
}): SwipeDecision {
  if (!(height > 0) || !Number.isFinite(dy)) return null;
  const velocity = Number.isFinite(vy) ? vy : 0;
  // Let go while coming back down: a change of mind, as sideways.
  if (velocity > VETO_VELOCITY) return null;
  if (-dy > height * SUPER_THRESHOLD) return 'super';
  // A flick still counts short of the line, but not from nowhere.
  if (velocity < -FLICK_VELOCITY && -dy > height * SUPER_FLOOR) return 'super';
  return null;
}

/**
 * Whether the card comes under the finger at all.
 *
 * Sideways either way, upwards only: nothing is bound to a downward drag
 * and a card that followed one would be moving for no reason. The
 * upward arm takes the tie, because a finger going up at exactly 45°
 * satisfied neither arm and the card sat still under it (QA,
 * 2026-09-23). Here rather than inline in the deck for the same reason
 * as `deckOffset`: it is a rule, and rules in this file have tests.
 */
export function claimsCard(dx: number, dy: number): boolean {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  if (Math.abs(dx) > CLAIM_DISTANCE && Math.abs(dx) > Math.abs(dy)) return true;
  return -dy > CLAIM_DISTANCE && Math.abs(dy) >= Math.abs(dx);
}
