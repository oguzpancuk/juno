import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext, useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { keyboardGap, webKeyboardTop } from './keyboard-gap';

/**
 * Minimal shape of what the web build needs from the browser: the layout
 * viewport's height, and the visual viewport, which is the part of it the
 * keyboard leaves visible.
 *
 * why: the app's TS lib has no DOM, and only the web branch below reaches
 * any of this.
 */
type WebWindow = {
  innerHeight: number;
  visualViewport?: {
    height: number;
    offsetTop: number;
    scale: number;
    addEventListener(type: string, fn: () => void): void;
    removeEventListener(type: string, fn: () => void): void;
  };
};

/**
 * How far this screen's bottom edge must lift to clear the keyboard.
 *
 * `KeyboardAvoidingView` cannot do it here: it measures its own frame from
 * an `onLayout`, which inside the chat's pager is a position in a
 * scrolling container, so the padding it computed was wrong and the
 * composer stayed under the keyboard (owner, 2026-09-16). This asks the
 * keyboard instead, and takes off what already sits below the screen —
 * under the tabs, the tab bar, which the keyboard covers anyway.
 *
 * One platform at a time, because each reports the keyboard differently:
 *
 * - **iOS** gives the frame directly. The `will` events carry it before
 *   the keyboard moves. A frame whose top is 0 is not a keyboard filling
 *   the window: it is what iOS reports under Prefer Cross-Fade
 *   Transitions, and RN's own `KeyboardAvoidingView` discards it too.
 * - **Android** resizes the window for the keyboard (`adjustResize`, the
 *   Expo default this app keeps), so the screen has already shrunk and
 *   any lift here would be a second helping. Nothing to do.
 * - **Web** has no keyboard events at all — react-native-web's `Keyboard`
 *   never fires — and no mobile browser shrinks the layout viewport for
 *   the keyboard, so the composer would sit under it. The visual viewport
 *   is what moves, and `window.innerHeight` is the layout viewport it is
 *   measured against: `useWindowDimensions` is no use here, because
 *   react-native-web reports the *visual* viewport there and the two would
 *   cancel out (checked in its Dimensions module, 2026-09-16).
 */
export function useKeyboardGap(): number {
  const { height } = useWindowDimensions();
  // Defined for a screen inside the tabs and undefined everywhere else —
  // the same question lib/insets.ts asks.
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  const [gap, setGap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const changed = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
      const top = event.endCoordinates.screenY;
      setGap(top <= 0 ? 0 : keyboardGap(height, top, tabBar));
    });
    const hidden = Keyboard.addListener('keyboardWillHide', () => setGap(0));
    return () => {
      changed.remove();
      hidden.remove();
    };
  }, [height, tabBar]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const win = globalThis as unknown as WebWindow;
    const view = win.visualViewport;
    if (!view) return;
    const update = () =>
      setGap(
        keyboardGap(
          win.innerHeight,
          webKeyboardTop(view.offsetTop, view.height, view.scale),
          tabBar,
        ),
      );
    update();
    view.addEventListener('resize', update);
    view.addEventListener('scroll', update);
    return () => {
      view.removeEventListener('resize', update);
      view.removeEventListener('scroll', update);
    };
  }, [tabBar]);

  return gap;
}
