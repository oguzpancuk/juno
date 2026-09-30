import { describe, expect, it } from 'vitest';
import { holdMatch, takeHeldMatches } from './held-matches';

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
