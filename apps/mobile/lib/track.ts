/**
 * The arithmetic behind the filter sliders, kept apart from the gesture so
 * it can be tested without a renderer.
 *
 * A track has `count` evenly spaced stops, numbered from 0, across `width`
 * points. The slider components map stops to values (a radius from a list,
 * an age as an offset from 18); nothing here knows what a stop means.
 */

/** A thumb's x on the track, from its left end. */
export function stopX(stop: number, width: number, count: number): number {
  if (count < 2 || !(width > 0)) return 0;
  return (clampStop(stop, count) / (count - 1)) * width;
}

/**
 * The stop nearest to `x`, clamped to the track: a finger that slides past
 * either end holds the end rather than losing the thumb. A track that has
 * not been laid out yet, or an x that is not a number, reads as stop 0 —
 * the caller only asks while a finger is down on a laid-out track, so this
 * is a guard, not a value anyone sees.
 */
export function stopAt(x: number, width: number, count: number): number {
  if (count < 2 || !(width > 0) || !Number.isFinite(x)) return 0;
  return clampStop(Math.round((x / width) * (count - 1)), count);
}

export type Thumb = 'low' | 'high';
export type Range = { low: number; high: number };

/**
 * How far a finger travels before a touch on a track is read as anything
 * but a tap: the deck's claim distance.
 */
export const TRACK_SLOP = 8;

/**
 * What a touch on a track has turned out to be, from how far it has moved
 * since it went down: a sideways drag of a thumb, a scroll of the sheet the
 * track sits in, or — until it has moved past the slop — nothing yet, which
 * is a tap if it lifts there. Decided once per touch, so a scroll that
 * wanders sideways stays a scroll (review, 2026-09-15: a touch meant to
 * scroll the sheet used to move a thumb and save it).
 */
export function readTouch(dx: number, dy: number): 'drag' | 'scroll' | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (!Number.isFinite(ax) || !Number.isFinite(ay)) return null;
  if (ax > TRACK_SLOP && ax > ay) return 'drag';
  if (ay > TRACK_SLOP) return 'scroll';
  return null;
}

/**
 * Which of two thumbs a touch at `stop` takes: the one on its side, or,
 * between them, the nearer one — the lower one on the middle stop. Only a
 * touch on a range closed to one stop has no side, and `null` says so; the
 * gesture then waits for the finger's first move and takes the thumb on
 * that side (`thumbForDirection`), because otherwise a range closed to one
 * age could never be opened again from the side the upper thumb is on.
 */
export function nearerThumb(stop: number, range: Range): Thumb | null {
  if (stop < range.low) return 'low';
  if (stop > range.high) return 'high';
  if (range.low === range.high) return null;
  return stop - range.low <= range.high - stop ? 'low' : 'high';
}

/** For a tie: a finger moving left takes the lower thumb. */
export function thumbForDirection(dx: number): Thumb | null {
  if (dx === 0 || !Number.isFinite(dx)) return null;
  return dx < 0 ? 'low' : 'high';
}

/**
 * Move one thumb to `stop`, never past the other one: the two may meet, as
 * the stored range may (`age_min <= age_max`), but not cross, so the thumb
 * under the finger stays the thumb under the finger.
 */
export function moveThumb(
  range: Range,
  thumb: Thumb,
  stop: number,
  count: number,
): Range {
  const at = clampStop(stop, count);
  return thumb === 'low'
    ? { low: Math.min(at, range.high), high: range.high }
    : { low: range.low, high: Math.max(at, range.low) };
}

/**
 * The stop showing a stored value that is not one of the stops. The radius
 * column accepts any whole kilometre from 5 to 500, and the options offer
 * five; a value written before the options existed, or by hand, shows at
 * the nearest option and is only rewritten if the user moves the thumb
 * (see `optionToWrite`).
 */
export function nearestStop(value: number, stops: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < stops.length; i += 1) {
    const option = stops[i];
    const current = stops[best];
    if (option === undefined || current === undefined) continue;
    if (Math.abs(option - value) < Math.abs(current - value)) best = i;
  }
  return best;
}

/**
 * The option to save when a thumb is let go on `stop`, or null when there
 * is nothing to save: the stop is the one the stored value already shows —
 * which leaves a stored value between the options alone — or it is not a
 * stop at all.
 */
export function optionToWrite(
  stop: number,
  stored: number,
  options: readonly number[],
): number | null {
  if (stop === nearestStop(stored, options)) return null;
  return options[stop] ?? null;
}

function clampStop(stop: number, count: number): number {
  if (!Number.isFinite(stop)) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(stop)));
}
