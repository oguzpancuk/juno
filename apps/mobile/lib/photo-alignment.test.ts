import { describe, expect, it } from 'vitest';
import { photoKey, sourcesFor, type FetchedSources } from './photo-alignment';

const source = (uri: string) => ({ uri });

describe('sourcesFor', () => {
  const paths = ['a/1.png', 'a/2.png'];
  const fetched: FetchedSources = {
    key: photoKey(paths),
    sources: [source('one'), source('two')],
  };

  it('pairs each path with its own source', () => {
    expect(sourcesFor(paths, fetched)).toEqual([source('one'), source('two')]);
  });

  it('keeps the position of a photo that could not be fetched', () => {
    // Compacting here is what put one person's photo on another's card.
    const withHole: FetchedSources = {
      key: photoKey(paths),
      sources: [null, source('two')],
    };
    expect(sourcesFor(paths, withHole)).toEqual([null, source('two')]);
  });

  it('shows nothing for paths the sources were not fetched for', () => {
    // The swipe case: the card already shows the next person's name, so
    // the photo held over from the last one would be someone else's.
    expect(sourcesFor(['b/1.png'], fetched)).toEqual([null]);
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
