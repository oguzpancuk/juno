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

/**
 * Which segment to light for a given scroll offset.
 *
 * The pager used to tell the segments where it was only on
 * `onMomentumScrollEnd`, and on the web that event does not arrive: with
 * `pagingEnabled` the browser snaps by CSS scroll-snap, which has no
 * momentum phase to end. So a member swiped from Sohbet to Uyum, read the
 * Uyum page, and the underline stayed under Sohbet (owner, 2026-09-18).
 *
 * Following the offset rather than waiting for it to settle also reads
 * better: the underline moves with the thumb instead of jumping when it
 * is let go.
 *
 * `back` is not a segment — it is the empty page the screen leaves
 * through — so an offset over it shows the thread, which is the page next
 * to it. Leaving is the settle handler's business, never this one's:
 * nothing here may take anyone off the screen.
 */
export function indicatorPage(x: number, width: number): Page {
  const at = pageAt(x, width);
  return at === 'match' ? 'match' : 'thread';
}

/** What the pager should do, now that it has stopped moving. */
export interface PagerSettle {
  /** The segment to light. Never `back`: that page has no segment. */
  readonly active: Page;
  /** Leave the screen. Only ever true with the finger off the glass. */
  readonly exit: boolean;
}

/**
 * The pager has been still for a moment. Has it settled, or is a finger
 * resting on it?
 *
 * The distinction is the whole of this function, and it exists because the
 * first version did not make it. Scroll events only arrive when the offset
 * changes, so "no events for a while" covers two different things: the
 * page has snapped, and the person is mid-drag, holding still to look.
 * Treating the second as the first meant that dragging right to peek at
 * the way out and then hesitating closed the chat under their finger
 * (review, 2026-09-18) — and on a stale offset, if the pause was the JS
 * thread stalling rather than the person.
 *
 * So leaving requires the finger to be up. The segment does not: it can
 * follow the offset all the way through a drag, and a wrong guess there
 * costs an underline in the wrong place for a moment, not a screen.
 */
export function pagerSettle({
  x,
  width,
  dragging,
}: {
  readonly x: number;
  readonly width: number;
  /** Is a finger on the pager right now? */
  readonly dragging: boolean;
}): PagerSettle {
  return {
    active: indicatorPage(x, width),
    exit: !dragging && atRest(x, width) === 'back',
  };
}

/**
 * How far off a page's exact offset still counts as being on it. A pager
 * that has snapped is at the offset to the pixel; anything else is
 * mid-gesture, whatever the clock says.
 */
const SNAP_SLOP = 2;

/**
 * The page the pager is *resting* on, or null if it is between pages.
 *
 * `pageAt` rounds, which is right for "what is mostly on screen" and wrong
 * for "has it finished": it calls any offset below half a width the exit
 * page, so a release at 0.45 of a width — a leftward flick the platform is
 * about to snap back to the thread — read as settled on the way out and
 * closed the chat the person had just flicked back into (review,
 * 2026-09-18).
 *
 * Asking for the exact offset also makes the answer independent of when it
 * is asked: an offset that is one page's to the pixel is that page's at
 * any width the pager has actually laid out at.
 */
function atRest(x: number, width: number): PagerPage | null {
  if (!Number.isFinite(x) || !(width > 0)) return null;
  const page = PAGER_PAGES.find(
    (candidate) => Math.abs(x - pageOffset(candidate, width)) <= SNAP_SLOP,
  );
  return page ?? null;
}
