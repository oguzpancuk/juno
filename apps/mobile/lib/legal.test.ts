import { describe, expect, it } from 'vitest';
import { legalSections } from './legal';
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
});
