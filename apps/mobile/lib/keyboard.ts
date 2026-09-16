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
