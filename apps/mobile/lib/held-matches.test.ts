import { describe, expect, it } from 'vitest';
import { holdMatch, takeHeldMatches, takeRevealFor } from './held-matches';

describe('matches held back by the notice gate', () => {
  it('gives back what arrived while the member was stopped, in order, once', () => {
    holdMatch('u1', 'm1');
    holdMatch('u1', 'm2');
    expect(takeHeldMatches('u1')).toEqual(['m1', 'm2']);
    // Taken: a second answer of `current` shows nothing again.
    expect(takeHeldMatches('u1')).toEqual([]);
  });

  it('keeps one entry per match', () => {
    // Realtime can deliver the same insert twice across a reconnect.
    holdMatch('u2', 'm1');
    holdMatch('u2', 'm1');
    expect(takeHeldMatches('u2')).toEqual(['m1']);
  });

  it('keeps each member apart', () => {
    // Another account signing in on the same device sees nothing of the
    // first one's matches.
    holdMatch('u3', 'm3');
    expect(takeHeldMatches('u4')).toEqual([]);
    expect(takeHeldMatches('u3')).toEqual(['m3']);
  });
});

describe('the one reveal shown after the gate', () => {
  it('shows the newest held match, once, and leaves the rest in the list', () => {
    // One router call into the tabs, never two in one flush (review of
    // #19, round 3): the others are rows in the matches list.
    holdMatch('u5', 'm1');
    holdMatch('u5', 'm2');
    const asked: string[] = [];
    const fresh = (id: string) => (asked.push(id), true);
    expect(takeRevealFor('u5', fresh)).toBe('m2');
    // Only the one shown spends its first sight.
    expect(asked).toEqual(['m2']);
    expect(takeRevealFor('u5', fresh)).toBeNull();
  });

  it('skips a match whose reveal was already shown', () => {
    holdMatch('u6', 'm1');
    holdMatch('u6', 'm2');
    expect(takeRevealFor('u6', (id) => id !== 'm2')).toBe('m1');
  });

  it('answers nothing when nothing was held', () => {
    expect(takeRevealFor('u7', () => true)).toBeNull();
  });
});
