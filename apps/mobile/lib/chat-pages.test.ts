import { describe, expect, it } from 'vitest';
import { PAGER_PAGES, pageAt, pageOffset } from './chat-pages';

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
