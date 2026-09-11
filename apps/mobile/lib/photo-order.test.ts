import { describe, expect, it } from 'vitest';
import { movePhoto } from './photo-order';

describe('movePhoto', () => {
  const photos = ['a', 'b', 'c', 'd'] as const;

  it('swaps a photo with its left neighbour', () => {
    expect(movePhoto(photos, 2, 'left')).toEqual(['a', 'c', 'b', 'd']);
  });

  it('swaps a photo with its right neighbour', () => {
    expect(movePhoto(photos, 1, 'right')).toEqual(['a', 'c', 'b', 'd']);
  });

  it('walks a photo to either end one step at a time', () => {
    const toFront = movePhoto(movePhoto(photos, 2, 'left'), 1, 'left');
    expect(toFront).toEqual(['c', 'a', 'b', 'd']);
    const toBack = movePhoto(movePhoto(photos, 1, 'right'), 2, 'right');
    expect(toBack).toEqual(['a', 'c', 'd', 'b']);
  });

  it('returns the same reference when nothing moves', () => {
    // A state setter given the same reference does not re-render, and a
    // key built from the list does not refetch — so "no move" must be
    // identity, not an equal copy.
    expect(movePhoto(photos, 0, 'left')).toBe(photos);
    expect(movePhoto(photos, photos.length - 1, 'right')).toBe(photos);
    expect(movePhoto(photos, -1, 'right')).toBe(photos);
    expect(movePhoto(photos, photos.length, 'left')).toBe(photos);
    expect(movePhoto(photos, 1.5, 'left')).toBe(photos);
    const one = ['only'];
    expect(movePhoto(one, 0, 'left')).toBe(one);
    expect(movePhoto(one, 0, 'right')).toBe(one);
    const none: string[] = [];
    expect(movePhoto(none, 0, 'left')).toBe(none);
  });

  it('never duplicates or drops a photo', () => {
    for (let index = 0; index < photos.length; index++) {
      for (const direction of ['left', 'right'] as const) {
        const moved = movePhoto(photos, index, direction);
        expect([...moved].sort()).toEqual([...photos].sort());
      }
    }
  });

  it('leaves the input untouched', () => {
    const input = ['a', 'b', 'c'];
    movePhoto(input, 1, 'left');
    expect(input).toEqual(['a', 'b', 'c']);
  });
});
