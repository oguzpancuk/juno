import { describe, expect, it } from 'vitest';
import { bioSlotHeight, MAX_DECK_SCALE } from './deck-layout';
import { space, type } from '../theme/tokens';

/** What the box takes besides its lines: vertical padding and two hairlines. */
const CHROME = 2 * space.md + 2;

describe('bioSlotHeight', () => {
  it('is three lines of the bio at the default text size', () => {
    expect(bioSlotHeight(1)).toBe(3 * type.body.lineHeight + CHROME);
  });

  it('grows with Dynamic Type, as the three lines inside it do', () => {
    // iOS scales a Text's line height with its font size
    // (RCTTextAttributes: _lineHeight * effectiveFontSizeMultiplier), so a
    // slot sized at 1.0 is too short for a full bio at 1.2 and the
    // photograph pays for the difference on that card only.
    expect(bioSlotHeight(1.2)).toBeCloseTo(
      3 * type.body.lineHeight * 1.2 + CHROME,
    );
  });

  it('stops where the deck caps the text', () => {
    const top = 3 * type.body.lineHeight * MAX_DECK_SCALE + CHROME;
    expect(bioSlotHeight(MAX_DECK_SCALE)).toBeCloseTo(top);
    expect(bioSlotHeight(3.1)).toBeCloseTo(top);
  });

  it('shrinks with smaller text, so the room never outgrows its lines', () => {
    expect(bioSlotHeight(0.82)).toBeCloseTo(
      3 * type.body.lineHeight * 0.82 + CHROME,
    );
  });

  it('reads a scale it cannot use as the default', () => {
    expect(bioSlotHeight(Number.NaN)).toBe(bioSlotHeight(1));
    expect(bioSlotHeight(0)).toBe(bioSlotHeight(1));
  });
});
