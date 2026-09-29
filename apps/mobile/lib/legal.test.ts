import { describe, expect, it } from 'vitest';
import { LEGAL_UPDATED, LEGAL_VERSION, legalSections } from './legal';
import { t } from './strings';

describe('the privacy notice', () => {
  it('names the onboarding link by its current label', () => {
    // The notice types the label out rather than importing it: a change
    // to UI copy must not quietly change the notice's text under a
    // version that says otherwise. This is what catches the rename, so
    // the notice is reworded, and its version moved, in the same change.
    const text = legalSections.flatMap((section) => section.body).join('\n');
    expect(text).toContain(`“${t.onboarding.switchAccount}”`);
  });

  it('keeps both the premium lines and the sign-in provider lines', () => {
    // Two PRs wrote into the same lists and were merged by hand (#14, then
    // #13); a resolution that kept one side only would pass everything
    // else.
    const text = legalSections.flatMap((section) => section.body).join('\n');
    expect(text).toContain('• Beğendiğin kişi.');
    expect(text).toContain('• Üyelik bilgin:');
    expect(text).toContain('• Giriş sağlayıcıları.');
    expect(text).toContain('• Apple ya da Google ile girersen:');
  });

  it('shows the date its version names', () => {
    // Both are moved by hand in every change to the text.
    const rendered = new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${LEGAL_VERSION}T00:00:00Z`));
    expect(LEGAL_UPDATED).toBe(rendered);
  });
});
