import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deckPhotoFor,
  forgetDeckPhoto,
  reportDeckPhoto,
  subscribeDeckPhoto,
} from './deck-photo';

afterEach(forgetDeckPhoto);

describe('the deck photograph, as the profile reads it', () => {
  it('is nothing until the deck has drawn one', () => {
    expect(deckPhotoFor(844)).toBeNull();
  });

  it('is the height the deck actually drew', () => {
    // On a phone the tab bar is 49 plus the home indicator's 34, so the
    // deck's card has 31 points less than on the web and its photograph
    // gives them up; the profile has to follow what was drawn, not the
    // fraction the deck asked for.
    reportDeckPhoto(844, 488);
    expect(deckPhotoFor(844)).toBe(488);
  });

  it('is not carried to a window of another height', () => {
    reportDeckPhoto(844, 488);
    expect(deckPhotoFor(932)).toBeNull();
  });

  it('keeps the latest, and tells whoever is listening', () => {
    const heard = vi.fn();
    const stop = subscribeDeckPhoto(heard);
    reportDeckPhoto(844, 519);
    reportDeckPhoto(844, 488);
    expect(deckPhotoFor(844)).toBe(488);
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    reportDeckPhoto(844, 470);
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it('does not wake anybody for the same number twice', () => {
    const heard = vi.fn();
    const stop = subscribeDeckPhoto(heard);
    reportDeckPhoto(844, 488);
    reportDeckPhoto(844, 488.2);
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });

  it('ignores a height it cannot draw', () => {
    reportDeckPhoto(844, 0);
    reportDeckPhoto(844, Number.NaN);
    expect(deckPhotoFor(844)).toBeNull();
  });
});
