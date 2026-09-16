import { describe, expect, it } from 'vitest';
import { keyboardGap } from './keyboard-gap';

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
