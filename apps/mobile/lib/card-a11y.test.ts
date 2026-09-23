import { describe, expect, it } from 'vitest';
import { likedYouBadge } from './card-a11y';
import { t } from './strings';

describe('the badge over a name on the deck', () => {
  it('draws the glyph and speaks the words without it', () => {
    expect(likedYouBadge('like')).toEqual({
      drawn: '♥  Seni beğendi',
      spoken: 'Seni beğendi',
    });
    expect(likedYouBadge('super')).toEqual({
      drawn: '★  Seni süper beğendi',
      spoken: 'Seni süper beğendi',
    });
  });

  it('is nothing at all for somebody who has not chosen you', () => {
    expect(likedYouBadge(null)).toBeNull();
  });
});

describe('what VoiceOver reads for the photograph', () => {
  // The label replaces everything drawn inside the button, so the badge
  // has to be in it. Review round 6: it was drawn and not spoken, and
  // there was no way in — the sheet the photograph opens is the only
  // other place the fact appears, and it does not appear there.
  it('announces the badge before the person, as it is drawn', () => {
    const badge = likedYouBadge('super');
    expect(
      t.discover.openPerson('Ece', 31, '8 km', badge?.spoken ?? null),
    ).toBe('Seni süper beğendi. Ece, 31, 8 km. Profili gör');
  });

  it('says the same as before for somebody who has not chosen you', () => {
    expect(
      t.discover.openPerson(
        'Melis',
        27,
        '21 km',
        likedYouBadge(null)?.spoken ?? null,
      ),
    ).toBe('Melis, 27, 21 km. Profili gör');
  });
});
