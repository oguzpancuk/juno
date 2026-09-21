import { createContext, useContext } from 'react';

/**
 * How a slider tells the scroll view it sits in to hold still.
 *
 * A slider's drag is a JS gesture and a scroll view's is a native one,
 * which takes over any touch that moves far enough — a few points up or
 * down is enough — so without this a sideways drag on a thumb turns into
 * the page scrolling and the thumb stops where it was.
 *
 * It lives in its own module because both hosts that own a scroll view
 * provide it — `Popup` and `Screen` — and those two live in files that
 * already import each other. The default is a no-op, so a track dropped
 * anywhere else still works, it is only easier to steal its gesture.
 *
 * Locked only once a touch has shown it is a drag, never on touch-down,
 * so a scroll that starts on a slider still scrolls.
 */
export const ScrollLock = createContext<(locked: boolean) => void>(() => {});

export function useSheetScrollLock(): (locked: boolean) => void {
  return useContext(ScrollLock);
}
