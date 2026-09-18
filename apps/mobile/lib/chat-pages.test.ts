import { describe, expect, it } from 'vitest';
import {
  PAGER_PAGES,
  indicatorPage,
  pageAt,
  pageOffset,
  pagerSettle,
} from './chat-pages';

const W = 390;

describe('chat pager pages', () => {
  it('puts the way out in front of the thread', () => {
    expect([...PAGER_PAGES]).toEqual(['back', 'thread', 'match']);
    expect(pageOffset('back', W)).toBe(0);
    expect(pageOffset('thread', W)).toBe(W);
    expect(pageOffset('match', W)).toBe(2 * W);
  });

  it('names the page a settled offset is showing', () => {
    expect(pageAt(0, W)).toBe('back');
    expect(pageAt(W, W)).toBe('thread');
    expect(pageAt(2 * W, W)).toBe('match');
    // Mid-drag, not settled: still the page it is nearest.
    expect(pageAt(W * 0.6, W)).toBe('thread');
  });

  // Each of these would otherwise resolve to `back`, and `back` leaves the
  // screen. A layout that has not happened must never navigate.
  it('refuses to read a page out of an offset it cannot trust', () => {
    expect(pageAt(0, 0)).toBe('thread');
    expect(pageAt(Number.NaN, W)).toBe('thread');
    expect(pageAt(0, Number.NaN)).toBe('thread');
    expect(pageAt(Number.POSITIVE_INFINITY, W)).toBe('thread');
  });

  it('clamps an offset past either end rather than returning nothing', () => {
    expect(pageAt(-40, W)).toBe('back');
    expect(pageAt(5000, W)).toBe('match');
  });
});

describe('indicatorPage', () => {
  const W = 390;

  it('lights the page the pager is showing, mid-swipe', () => {
    // The bug: the underline stayed on Sohbet while Uyum was on screen,
    // because the only report came from an event the web never fires.
    expect(indicatorPage(pageOffset('match', W), W)).toBe('match');
    expect(indicatorPage(pageOffset('thread', W), W)).toBe('thread');
    // Past the halfway point it has changed over.
    expect(indicatorPage(W * 1.6, W)).toBe('match');
    expect(indicatorPage(W * 1.4, W)).toBe('thread');
  });

  it('never names the exit page: that one has no segment', () => {
    expect(indicatorPage(0, W)).toBe('thread');
    expect(indicatorPage(W * 0.2, W)).toBe('thread');
    expect(indicatorPage(-50, W)).toBe('thread');
  });

  it('answers something sane before layout', () => {
    expect(indicatorPage(Number.NaN, W)).toBe('thread');
    expect(indicatorPage(100, 0)).toBe('thread');
  });
});

describe('pagerSettle', () => {
  const W = 390;
  const back = pageOffset('back', W);

  it('leaves through the empty page once the finger is up', () => {
    expect(pagerSettle({ x: back, width: W, dragging: false })).toEqual({
      active: 'thread',
      exit: true,
    });
  });

  /**
   * The failure this exists to stop: a right-drag to peek at the way out,
   * then a pause. Scroll events stop because the offset stops changing,
   * and the first version read that as settled and closed the chat under
   * the finger.
   */
  it('never leaves while a finger is still on the pager', () => {
    expect(pagerSettle({ x: back, width: W, dragging: true }).exit).toBe(false);
    expect(pagerSettle({ x: W * 0.2, width: W, dragging: true }).exit).toBe(
      false,
    );
  });

  it('follows the segment through the drag either way', () => {
    for (const dragging of [true, false]) {
      expect(pagerSettle({ x: W * 1.7, width: W, dragging }).active).toBe(
        'match',
      );
      expect(pagerSettle({ x: W * 1.2, width: W, dragging }).active).toBe(
        'thread',
      );
      // Over the exit page the segment shows the thread beside it.
      expect(pagerSettle({ x: back, width: W, dragging }).active).toBe(
        'thread',
      );
    }
  });

  it('does not leave from a page that is not the exit', () => {
    for (const page of ['thread', 'match'] as const) {
      expect(
        pagerSettle({ x: pageOffset(page, W), width: W, dragging: false }).exit,
      ).toBe(false);
    }
  });

  it('refuses to leave on an offset it cannot read', () => {
    expect(pagerSettle({ x: Number.NaN, width: W, dragging: false }).exit).toBe(
      false,
    );
    expect(pagerSettle({ x: 0, width: 0, dragging: false }).exit).toBe(false);
  });
});

describe('pagerSettle only leaves from a page the pager is resting on', () => {
  const W = 390;

  /**
   * The flick-back case. `pageAt` rounds, so anything below half a width
   * reads as the exit page — including a release at 0.45 that the platform
   * is about to snap back to the thread. If a stall delays the next scroll
   * event past the quiet spell, the timer fires on that release offset.
   */
  it('refuses an offset that is between pages', () => {
    expect(pagerSettle({ x: W * 0.45, width: W, dragging: false }).exit).toBe(
      false,
    );
    expect(pagerSettle({ x: W * 0.1, width: W, dragging: false }).exit).toBe(
      false,
    );
  });

  it('accepts the exit page to within a couple of points', () => {
    for (const x of [0, 1, -1, 2]) {
      expect(pagerSettle({ x, width: W, dragging: false }).exit).toBe(true);
    }
    expect(pagerSettle({ x: 5, width: W, dragging: false }).exit).toBe(false);
  });

  /**
   * And this is what makes a settle independent of when it is read: an
   * offset that is one page's to the pixel cannot be another page's at a
   * different width, so a width that changed between arming the timer and
   * firing it can no longer turn the thread into the way out.
   */
  it('does not read the thread as the exit at any other width', () => {
    const onThread = pageOffset('thread', W);
    for (const width of [W, 844, 320, 1024]) {
      if (width === W) continue;
      expect(pagerSettle({ x: onThread, width, dragging: false }).exit).toBe(
        false,
      );
    }
  });
});
