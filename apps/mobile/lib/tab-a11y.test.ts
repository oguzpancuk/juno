import { describe, expect, it } from 'vitest';
import { tabAccessibilityLabel } from './tab-a11y';

describe('tab accessibility label', () => {
  it("keeps the library's iOS role and position, then adds the count", () => {
    expect(
      tabAccessibilityLabel('ios', 'Eşleşmeler', 2, 3, '2 okunmamış mesaj'),
    ).toBe('Eşleşmeler, tab, 3 of 3, 2 okunmamış mesaj');
  });

  it('leaves role and position to the platform elsewhere', () => {
    expect(
      tabAccessibilityLabel('android', 'Eşleşmeler', 2, 3, '2 okunmamış mesaj'),
    ).toBe('Eşleşmeler, 2 okunmamış mesaj');
    expect(
      tabAccessibilityLabel('web', 'Eşleşmeler', 2, 3, '1 okunmamış mesaj'),
    ).toBe('Eşleşmeler, 1 okunmamış mesaj');
  });

  it('does not invent a position it could not find', () => {
    expect(
      tabAccessibilityLabel('ios', 'Eşleşmeler', -1, 3, '2 okunmamış mesaj'),
    ).toBe('Eşleşmeler, 2 okunmamış mesaj');
  });
});
