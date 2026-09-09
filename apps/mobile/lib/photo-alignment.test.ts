import { describe, expect, it } from 'vitest';
import { photoKey, sourcesFor, type FetchedSources } from './photo-alignment';

const source = (uri: string) => ({ uri });

describe('sourcesFor', () => {
  const paths = ['a/1.png', 'a/2.png'];
  const fetched: FetchedSources = {
    paths,
    sources: [source('one'), source('two')],
  };

  it('pairs each path with its own source', () => {
    expect(sourcesFor(paths, fetched)).toEqual([source('one'), source('two')]);
  });

  it('keeps the position of a photo that could not be fetched', () => {
    // Compacting here is what put one person's photo on another's card.
    const withHole: FetchedSources = {
      paths,
      sources: [null, source('two')],
    };
    expect(sourcesFor(paths, withHole)).toEqual([null, source('two')]);
  });

  it('shows nothing for paths the sources were not fetched for', () => {
    // The swipe case: the card already shows the next person's name, so
    // the photo held over from the last one would be someone else's. A
    // path carries the owner's id, so nothing can match by accident.
    expect(sourcesFor(['b/1.png'], fetched)).toEqual([null]);
  });

  it('keeps the sources of paths that survive a change to the set', () => {
    // Removing one photo of several must not blank the others while the
    // rest are refetched.
    expect(sourcesFor(['a/2.png'], fetched)).toEqual([source('two')]);
    expect(sourcesFor(['a/2.png', 'a/3.png'], fetched)).toEqual([
      source('two'),
      null,
    ]);
  });

  it('follows the path when the order changes', () => {
    expect(sourcesFor(['a/2.png', 'a/1.png'], fetched)).toEqual([
      source('two'),
      source('one'),
    ]);
  });

  it('always answers one entry per path', () => {
    for (const set of [[], ['a/1.png'], paths, [...paths, 'a/3.png']]) {
      expect(sourcesFor(set, fetched)).toHaveLength(set.length);
    }
  });

  it('tells the same paths in a different order apart', () => {
    expect(photoKey(['a/1.png', 'a/2.png'])).not.toBe(
      photoKey(['a/2.png', 'a/1.png']),
    );
  });
});
