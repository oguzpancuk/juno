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
 * `useId` is per component instance, so two marks never collide. React's
 * colons come out of it: they are legal inside an id attribute but not
 * inside the bare `url(#…)` that names it.
 *
 * Every `id` under a `<Defs>` in this app goes through here. A literal one
 * works until the day a second instance of its component is on screen,
 * and that day arrives without a test failing.
 */
export function useSvgId(name: string): { id: string; url: string } {
  const unique = `${name}-${useId().replace(/:/gu, '')}`;
  return { id: unique, url: `url(#${unique})` };
}
