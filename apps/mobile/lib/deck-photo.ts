/**
 * How tall the deck's photograph was actually drawn, so the profile can
 * draw its own at the same height (owner, 2026-09-24: "profil ve
 * kesfette fotolar ayni hizada degil. kesfetteki guzel, profildekini de
 * ayni hale getir").
 *
 * Both ask for `PHOTO_SCREEN_FRACTION` of the window, but only the deck
 * has to fit a whole card above the tab bar, and it gives way when it
 * cannot. On a phone the bar is 49 points plus the home indicator's 34,
 * against about 52 in a browser, so on the same 844-point screen the deck
 * has 31 points less and its photograph is that much shorter than the
 * fraction, while the profile, which scrolls, never gives anything up.
 * The web export measured them equal and the phone showed them apart.
 * Rather than guessing what the deck will be left with (the bar, the
 * text size and the fonts all move it), the deck reports what it drew
 * and the profile follows.
 *
 * Kept per window height: a number measured on one window is no answer
 * for another. Until the deck has drawn a card at this height, the
 * profile falls back to the fraction; the deck is the first tab, so in
 * practice it has. A profile opened during the deck's very first load
 * (or while it shows an error or an empty deck) draws the fraction and
 * then moves once, when the first card lays out: once per launch at most,
 * and the price of following what was drawn rather than guessing it.
 *
 * Only an ordinary card reports. The deck's footer can carry a line of
 * error text until the next swipe, and at 844 nothing is spare, so that
 * line comes out of the photograph; the deck does not report while it is
 * there, or a failed like would shorten the profile's photograph too
 * (review round 12).
 *
 * Plain module state rather than a context: the two screens are siblings
 * under the tab navigator and share nothing else, and this has no React
 * or React Native in it so Vitest can drive it.
 */
let drawn: { readonly windowHeight: number; readonly photo: number } | null =
  null;
const listeners = new Set<() => void>();

/** The deck, from its photograph's layout. */
export function reportDeckPhoto(
  windowHeight: number,
  photoHeight: number,
): void {
  if (!Number.isFinite(photoHeight) || photoHeight <= 0) return;
  const atWindow = Math.round(windowHeight);
  const photo = Math.round(photoHeight);
  if (
    drawn !== null &&
    drawn.windowHeight === atWindow &&
    drawn.photo === photo
  )
    return;
  drawn = { windowHeight: atWindow, photo };
  for (const listener of listeners) listener();
}

/** The height the deck drew at this window height, or null if it has not. */
export function deckPhotoFor(windowHeight: number): number | null {
  return drawn !== null && drawn.windowHeight === Math.round(windowHeight)
    ? drawn.photo
    : null;
}

/** For `useSyncExternalStore`. */
export function subscribeDeckPhoto(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests only: start from nothing. */
export function forgetDeckPhoto(): void {
  drawn = null;
}
