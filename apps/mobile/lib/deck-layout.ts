/**
 * The deck card's text-size arithmetic, apart from the screen so it can be
 * driven by Vitest: `discover.tsx` imports React Native, which Vitest
 * cannot parse. Only `theme/tokens`, which imports nothing.
 */
import { space, type } from '../theme/tokens';

/**
 * A ceiling on Dynamic Type below the photo. The card has to fit one
 * screen with nothing to scroll into (owner, 2026-09-14), so text that
 * grew without limit would eat the picture instead of running off the
 * bottom. 1.35 is the top of iOS's standard range; the accessibility
 * sizes are served uncapped by the two sheets, which do scroll.
 */
export const MAX_DECK_SCALE = 1.35;

/** How many lines of the bio the card shows ("bioyu 3 satir gozukecek sekilde yap"). */
const BIO_LINES = 3;

/**
 * The bio's box, three lines tall on every card: the lines, the box's
 * vertical padding and its two hairlines. The photograph is the
 * profile's height (owner, 2026-09-24: "profille ayni olsun"), so it no
 * longer takes up what a short bio leaves over; a box the same size on
 * every card is what keeps that from turning into a gap above the
 * buttons, and keeps the buttons where the thumb left them. A card with
 * no bio keeps the room empty rather than letting the buttons jump.
 *
 * Scaled by the text size, capped where the card caps its text: iOS
 * grows a Text's line height with its font (`RCTTextAttributes`,
 * `_lineHeight * effectiveFontSizeMultiplier`), so a room sized at the
 * default was 24 points short of a full bio at 1.35, and the photograph
 * gave them up on that card only (review round 10; owner chose to fix
 * it, 2026-09-24). The padding and the hairlines do not scale.
 */
export function bioSlotHeight(fontScale: number): number {
  const scale =
    Number.isFinite(fontScale) && fontScale > 0
      ? Math.min(fontScale, MAX_DECK_SCALE)
      : 1;
  return BIO_LINES * type.body.lineHeight * scale + 2 * space.md + 2;
}
