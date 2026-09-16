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

/**
 * Where the keyboard begins on the web, in the layout viewport's own
 * coordinates: the bottom of the visual viewport. `scale` undoes pinch
 * zoom, which shrinks the visual viewport without the keyboard being
 * anywhere near — react-native-web's Dimensions module does the same.
 */
export function webKeyboardTop(
  offsetTop: number,
  height: number,
  scale: number,
): number {
  if (!Number.isFinite(offsetTop) || !Number.isFinite(height)) {
    return Number.NaN;
  }
  const zoom = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return offsetTop + height * zoom;
}
