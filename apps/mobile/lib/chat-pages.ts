/**
 * Where the chat's horizontal pager can settle.
 *
 * There is a third page in front of the thread and it is empty. It is not
 * a page to read, it is the way out: a right-swipe pages onto it and the
 * screen leaves when it settles there (owner, 2026-09-14: "sağa
 * kaydırdığında eşleşmelere geri dönsün").
 *
 * Doing it inside the pager rather than with a gesture of our own is what
 * keeps Uyum's right-swipe intact — from the match page a right-swipe is
 * one page back to the thread, because that is all it has ever been. It
 * is also the only arrangement the native stack cannot veto: on iOS the
 * whole-screen pop gesture is required to fail behind any scroll view
 * whose content is wider than its frame (react-native-screens,
 * `ios/RNSScreenStack.mm` `shouldRequireFailureOfGestureRecognizer`), and
 * this pager always is. Only the system edge strip pops today, which is
 * why the chat read as having no swipe-back at all.
 */
export const PAGER_PAGES = ['back', 'thread', 'match'] as const;
export type PagerPage = (typeof PAGER_PAGES)[number];

/** The two pages with a segment above them, in segment order. */
export const VISIBLE_PAGES = ['thread', 'match'] as const;
export type Page = (typeof VISIBLE_PAGES)[number];

/** The pager's content offset for a page, at this width. */
export function pageOffset(page: PagerPage, width: number): number {
  return PAGER_PAGES.indexOf(page) * width;
}

/**
 * The page a content offset is showing.
 *
 * It clamps, and it refuses to guess: a width of 0 (before layout, or the
 * web client before it has a viewport) would divide to NaN, and NaN
 * rounding to 0 would read as `back` — which navigates. Nothing here may
 * take the user off the screen by arithmetic accident.
 */
export function pageAt(x: number, width: number): PagerPage {
  if (!Number.isFinite(x) || !(width > 0)) return 'thread';
  const index = Math.min(
    Math.max(Math.round(x / width), 0),
    PAGER_PAGES.length - 1,
  );
  return PAGER_PAGES[index] ?? 'thread';
}
