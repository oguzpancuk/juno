import type { LikesMe } from './discover-row';
import { t } from './strings';

/**
 * The badge over a name on the deck, drawn and spoken from one place.
 *
 * They have to come from one rule for the same reason the stamp and the
 * verdict do. The badge is painted inside the photograph's button, and a
 * button's `accessibilityLabel` replaces everything drawn inside it — so
 * a badge that is only drawn is a badge VoiceOver never reads, which is
 * exactly what shipped and what review round 6 caught. `drawn` carries
 * the glyph, `spoken` does not: a screen reader announcing "black heart
 * suit" helps nobody.
 */
export function likedYouBadge(
  likes: LikesMe | null,
): { readonly drawn: string; readonly spoken: string } | null {
  if (likes === 'super') {
    const spoken = t.discover.likedYouSuper;
    return { drawn: `★  ${spoken}`, spoken };
  }
  if (likes === 'like') {
    const spoken = t.discover.likedYou;
    return { drawn: `♥  ${spoken}`, spoken };
  }
  // null, and anything a build of the app does not know: the column is
  // `.catch(null)` in `DiscoverRowSchema`, so a value added to the view
  // later reaches here as null rather than as a badge nobody can read.
  return null;
}
