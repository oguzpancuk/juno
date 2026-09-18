import { useId } from 'react';

/**
 * A document-unique id for an SVG paint server, and the `url(#…)` that
 * points at it.
 *
 * An id inside an `<Svg>` is not scoped to that `<Svg>` on the web: it
 * lands in the page's single id namespace, `url(#orbit-ring)` resolves to
 * whichever element claimed the name first, and a gradient sitting inside
 * a screen the router has hidden paints nothing at all. So the second
 * `OrbitMark` on the stack drew an invisible ring — which is what the
 * sign-up door showed under its wordmark: empty space where the mark
 * should be. Confirmed in the browser on 2026-09-17 by deleting the
 * hidden first copy from the DOM, at which point the ring appeared.
 *
 * `useId` is per component instance, so two marks never collide. The
 * `replace` is defensive rather than load-bearing: React 18 built its ids
 * out of colons, which are legal in an id attribute but not in the bare
 * `url(#…)` that names it, while the pinned React 19 returns `_R_0_` and
 * has nothing to strip. It stays because the id format is React's to
 * change and a colon coming back would break every gradient at once.
 *
 * Every `id` under a `<Defs>` in this app goes through here. A literal one
 * works until the day a second instance of its component is on screen,
 * and that day arrives without a test failing.
 */
export function useSvgId(name: string): { id: string; url: string } {
  const unique = `${name}-${useId().replace(/:/gu, '')}`;
  return { id: unique, url: `url(#${unique})` };
}
