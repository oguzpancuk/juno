/**
 * How far a screen's own bottom edge must lift to clear the keyboard.
 *
 * `covered` is what already sits between the screen and the bottom of the
 * window — under the tabs that is the tab bar, which the keyboard covers
 * anyway, so the lift is only the part of the keyboard that reaches above
 * it. Nothing to clear (no keyboard, or one that starts below the screen)
 * is 0.
 */
export function keyboardGap(
  windowHeight: number,
  keyboardTop: number,
  covered: number,
): number {
  if (!Number.isFinite(windowHeight) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, windowHeight - keyboardTop - Math.max(0, covered));
}
