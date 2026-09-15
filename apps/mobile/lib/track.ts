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
 * Which of two thumbs a touch at `stop` takes: the nearer one. When the two
 * sit on the same stop — or the touch is exactly between them — neither is
 * nearer, and `null` says so; the gesture then waits for the finger's first
 * move and takes the thumb on that side (`thumbForDirection`), because
 * otherwise a range closed to one age could never be opened again from the
 * side the upper thumb is on.
 */
export function nearerThumb(stop: number, range: Range): Thumb | null {
  const toLow = Math.abs(stop - range.low);
  const toHigh = Math.abs(stop - range.high);
  if (toLow === toHigh) return null;
  return toLow < toHigh ? 'low' : 'high';
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
 * the nearest option and is only rewritten if the user moves the thumb.
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

function clampStop(stop: number, count: number): number {
  if (!Number.isFinite(stop)) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(stop)));
}
