import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext, useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { keyboardGap } from './keyboard-gap';

/**
 * The gap for the screen this is called from, kept current as the keyboard
 * opens, closes and changes height (a language switch, the emoji sheet).
 *
 * `KeyboardAvoidingView` cannot do it here: it measures its own frame from
 * an `onLayout`, which inside the chat's pager is relative to a scrolling
 * container, so the padding it computed was wrong and the composer stayed
 * under the keyboard (owner, 2026-09-16). This asks the keyboard where it
 * is instead, and the caller subtracts what the tab bar already covers.
 *
 * The `will` events on iOS fire with the animation, so the composer moves
 * with the keyboard rather than after it. Android has only the `did`
 * pair. On web react-native-web reports no keyboard at all and the gap
 * stays 0.
 */
export function useKeyboardGap(): number {
  const { height } = useWindowDimensions();
  // Defined for a screen inside the tabs and undefined anywhere else —
  // the same question lib/insets.ts asks.
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);

  // Web: react-native-web's Keyboard never fires and reports the keyboard
  // as never visible, and neither mobile browser shrinks the layout
  // viewport for it — the page keeps its height and the keyboard is drawn
  // over the bottom of it. What does move is the visual viewport, so that
  // is what this asks (checked 2026-09-16 in node_modules/react-native-web
  // exports/Keyboard).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // why: the app's TS lib has no DOM, and only the web build reaches
    // this; the shape used is the three fields of VisualViewport.
    const view = (
      globalThis as unknown as {
        visualViewport?: {
          height: number;
          offsetTop: number;
          addEventListener(type: string, fn: () => void): void;
          removeEventListener(type: string, fn: () => void): void;
        };
      }
    ).visualViewport;
    if (!view) return;
    const update = () => setKeyboardTop(view.offsetTop + view.height);
    update();
    view.addEventListener('resize', update);
    view.addEventListener('scroll', update);
    return () => {
      view.removeEventListener('resize', update);
      view.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ios = Platform.OS === 'ios';
    const shown = Keyboard.addListener(
      ios ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      (event) => setKeyboardTop(event.endCoordinates.screenY),
    );
    const hidden = Keyboard.addListener(
      ios ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardTop(null),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return keyboardTop === null ? 0 : keyboardGap(height, keyboardTop, tabBar);
}
