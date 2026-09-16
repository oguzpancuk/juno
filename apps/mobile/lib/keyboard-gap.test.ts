import { describe, expect, it } from 'vitest';
import { keyboardGap, webKeyboardTop } from './keyboard-gap';

// An iPhone 17 Pro in portrait: 874pt tall, a 49pt tab row over a 34pt
// home-indicator inset, and a keyboard whose top edge sits at 542.
const WINDOW = 874;
const TAB_BAR = 83;

describe('keyboard gap', () => {
  it('lifts by the part of the keyboard the tab bar does not already cover', () => {
    expect(keyboardGap(WINDOW, 542, TAB_BAR)).toBe(249);
  });

  it('is nothing when the keyboard starts below the screen', () => {
    expect(keyboardGap(WINDOW, WINDOW, TAB_BAR)).toBe(0);
    expect(keyboardGap(WINDOW, WINDOW + 40, TAB_BAR)).toBe(0);
  });

  it('lifts by the whole keyboard where nothing sits below the screen', () => {
    expect(keyboardGap(WINDOW, 542, 0)).toBe(332);
  });

  it('never lifts by a negative amount, whatever it is told', () => {
    expect(keyboardGap(WINDOW, 542, -50)).toBe(332);
    expect(keyboardGap(WINDOW, 900, TAB_BAR)).toBe(0);
    expect(keyboardGap(Number.NaN, 542, TAB_BAR)).toBe(0);
    expect(keyboardGap(WINDOW, Number.NaN, TAB_BAR)).toBe(0);
  });
});

describe('keyboard gap on the web', () => {
  // The window here is the LAYOUT viewport (`window.innerHeight`), which
  // the keyboard never changes; what moves is the visual viewport, whose
  // bottom is where the keyboard begins.
  it('is nothing while the visual viewport fills the window', () => {
    expect(keyboardGap(WINDOW, webKeyboardTop(0, WINDOW, 1), TAB_BAR)).toBe(0);
  });

  it('is the part of a shrunken visual viewport the bar does not cover', () => {
    expect(keyboardGap(WINDOW, webKeyboardTop(0, 542, 1), TAB_BAR)).toBe(249);
    // Scrolled: the viewport's top has moved down with the page.
    expect(keyboardGap(WINDOW, webKeyboardTop(40, 502, 1), TAB_BAR)).toBe(249);
  });

  it('does not read pinch zoom as a keyboard', () => {
    // Zoomed to 2x with no keyboard: the visual viewport is half as tall.
    expect(keyboardGap(WINDOW, webKeyboardTop(0, WINDOW / 2, 2), TAB_BAR)).toBe(
      0,
    );
    // Zoomed, with a keyboard: the lift is still the keyboard's own.
    expect(keyboardGap(WINDOW, webKeyboardTop(0, 271, 2), TAB_BAR)).toBe(249);
  });

  it('reads a viewport it cannot measure as no keyboard', () => {
    expect(
      keyboardGap(WINDOW, webKeyboardTop(Number.NaN, 542, 1), TAB_BAR),
    ).toBe(0);
    // A scale of 0 would collapse the viewport; it is ignored.
    expect(keyboardGap(WINDOW, webKeyboardTop(0, WINDOW, 0), TAB_BAR)).toBe(0);
  });
});
