import { describe, expect, it } from 'vitest';
import {
  INTEREST_TAGS,
  MAX_DETAIL_LENGTH,
  MAX_HEIGHT_CM,
  MAX_INTERESTS,
  MIN_HEIGHT_CM,
  cleanDetail,
  heightStop,
  isHeight,
  isInterestTag,
  normalizeInterests,
  searchInterests,
  shortSchool,
  stopHeight,
  toggleInterest,
} from './profile-details';

/** Stand-in for `strings.ts`: the search reads the Turkish word, not the key. */
const NAMES: Partial<Record<string, string>> = {
  music: 'Müzik',
  live_music: 'Canlı müzik',
  cinema: 'Sinema',
  cats: 'Kediler',
  cycling: 'Bisiklet',
  street_food: 'Sokak lezzetleri',
};
const name = (tag: string) => NAMES[tag] ?? tag;

describe('interest tags', () => {
  it('has no duplicate keys', () => {
    expect(new Set(INTEREST_TAGS).size).toBe(INTEREST_TAGS.length);
  });

  it('knows its own keys and nothing else', () => {
    expect(isInterestTag('music')).toBe(true);
    expect(isInterestTag('Music')).toBe(false);
    expect(isInterestTag('kripto')).toBe(false);
  });

  it('drops keys it does not know', () => {
    expect(normalizeInterests(['music', 'kripto', 'cats'])).toEqual([
      'music',
      'cats',
    ]);
  });

  it('keeps one of each and puts them in the canonical order', () => {
    // Given back to front and doubled: the list is a set, and the chips
    // are drawn in the order the module declares, not the order of picking.
    expect(normalizeInterests(['cats', 'music', 'cats'])).toEqual([
      'music',
      'cats',
    ]);
  });

  it('never returns more than the cap', () => {
    const tooMany = INTEREST_TAGS.slice(0, MAX_INTERESTS + 3);
    expect(normalizeInterests([...tooMany])).toHaveLength(MAX_INTERESTS);
  });

  it('adds and removes one tag', () => {
    expect(toggleInterest([], 'music')).toEqual(['music']);
    expect(toggleInterest(['music', 'cats'], 'music')).toEqual(['cats']);
  });

  it('refuses an addition at the cap, and says so by changing nothing', () => {
    const full = normalizeInterests([...INTEREST_TAGS.slice(0, MAX_INTERESTS)]);
    const next = toggleInterest(full, 'volunteering');
    expect(next).toEqual(full);
    // Removing still works at the cap: otherwise the list would be stuck.
    expect(toggleInterest(full, full[0] as never)).toHaveLength(
      MAX_INTERESTS - 1,
    );
  });
});

describe('cleanDetail', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanDetail('  Boğaziçi   Üniversitesi ')).toBe(
      'Boğaziçi Üniversitesi',
    );
  });

  it('reads an empty answer as null, not as an empty string', () => {
    expect(cleanDetail('')).toBeNull();
    expect(cleanDetail('   ')).toBeNull();
  });

  it('refuses text longer than the column allows', () => {
    expect(cleanDetail('a'.repeat(MAX_DETAIL_LENGTH))).toHaveLength(
      MAX_DETAIL_LENGTH,
    );
    expect(cleanDetail('a'.repeat(MAX_DETAIL_LENGTH + 1))).toBeUndefined();
  });
});

describe('interest search', () => {
  it('gives the whole list for an empty query', () => {
    expect(searchInterests('', name)).toEqual(INTEREST_TAGS);
    expect(searchInterests('   ', name)).toEqual(INTEREST_TAGS);
  });

  it('matches anywhere in the Turkish word, not only its start', () => {
    expect(searchInterests('müzik', name)).toEqual(['music', 'live_music']);
  });

  it('folds Turkish case and diacritics, both ways', () => {
    // "I" and "İ", "i" and "ı" all fold together: typing the ascii
    // keyboard's letters must still find "Müzik" and "Bisiklet".
    expect(searchInterests('MUZIK', name)).toContain('music');
    expect(searchInterests('bisiklet', name)).toEqual(['cycling']);
    expect(searchInterests('BİSİKLET', name)).toEqual(['cycling']);
  });

  it('keeps the canonical order and can match nothing', () => {
    // "Müzik" and "Canlı müzik" both carry an i; the list comes back in
    // the module's order, not in the order the matches were found.
    expect(searchInterests('i', name).slice(0, 2)).toEqual([
      'music',
      'live_music',
    ]);
    expect(searchInterests('kripto', name)).toEqual([]);
  });
});

describe('short school name', () => {
  it('abbreviates the kind of school and keeps the name', () => {
    expect(shortSchool('Boğaziçi Üniversitesi')).toBe('Boğaziçi Ü.');
    expect(shortSchool('Orta Doğu Teknik Üniversitesi')).toBe(
      'Orta Doğu Teknik Ü.',
    );
    expect(shortSchool('Robert Koleji')).toBe('Robert K.');
  });

  it('matches the term whatever its case or diacritics', () => {
    expect(shortSchool('Koç UNIVERSITESI')).toBe('Koç Ü.');
    expect(shortSchool('Sabancı universite')).toBe('Sabancı Ü.');
    expect(shortSchool('Boston College')).toBe('Boston C.');
    expect(shortSchool('İstanbul Bilgi Uni')).toBe('İstanbul Bilgi U.');
  });

  it('keeps the language the term was written in', () => {
    // The Turkish word shortens to "Ü.", the English one to "U.", so a
    // name does not change language halfway through.
    expect(shortSchool('Hacettepe Üniversitesi')).toBe('Hacettepe Ü.');
    expect(shortSchool('Cambridge University')).toBe('Cambridge U.');
  });

  it('tells the two short forms apart, which the fold cannot', () => {
    // "Üni" and "Uni" fold to the same key — the fold drops exactly the
    // letter that says which language it is — so the answer is read off
    // the word as it was typed, not off the key.
    expect(shortSchool('Boğaziçi Üni')).toBe('Boğaziçi Ü.');
    expect(shortSchool('Boğaziçi ÜNİ')).toBe('Boğaziçi Ü.');
    expect(shortSchool('Boston Uni')).toBe('Boston U.');
  });

  it('does not eat a word that holds a term inside it', () => {
    // Whole words only. These two carry a term as a substring, which is
    // what separates the rule from a `replace(/üniversite|.../gi, ...)`:
    // that version turns the first into "K.liler Vakfı Lisesi".
    expect(shortSchool('Kolejliler Vakfı Lisesi')).toBe(
      'Kolejliler Vakfı Lisesi',
    );
    expect(shortSchool('Üniversiteliler Derneği')).toBe(
      'Üniversiteliler Derneği',
    );
    expect(shortSchool('Üsküdar Üniversitesi')).toBe('Üsküdar Ü.');
    expect(shortSchool('İTÜ')).toBe('İTÜ');
  });

  it('abbreviates each term where it stands', () => {
    expect(shortSchool('University of Cambridge')).toBe('U. of Cambridge');
    expect(shortSchool('University College London')).toBe('U. C. London');
  });

  it('gives the original back rather than a bare initial', () => {
    expect(shortSchool('Üniversite')).toBe('Üniversite');
    expect(shortSchool('')).toBe('');
  });

  it('leaves a name with no such term alone', () => {
    expect(shortSchool('Galatasaray Lisesi')).toBe('Galatasaray Lisesi');
  });
});

describe('height', () => {
  it('accepts the picker range and null, and nothing else', () => {
    expect(isHeight(null)).toBe(true);
    expect(isHeight(MIN_HEIGHT_CM)).toBe(true);
    expect(isHeight(MAX_HEIGHT_CM)).toBe(true);
    expect(isHeight(MIN_HEIGHT_CM - 1)).toBe(false);
    expect(isHeight(MAX_HEIGHT_CM + 1)).toBe(false);
    expect(isHeight(175.5)).toBe(false);
  });

  it('maps a height to a stop and back', () => {
    expect(stopHeight(heightStop(178))).toBe(178);
    expect(heightStop(MIN_HEIGHT_CM)).toBe(0);
  });

  it('clamps a stored height outside the picker to its ends', () => {
    expect(stopHeight(heightStop(MAX_HEIGHT_CM + 40))).toBe(MAX_HEIGHT_CM);
    expect(stopHeight(heightStop(10))).toBe(MIN_HEIGHT_CM);
  });
});
