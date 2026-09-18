import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The gap a screen leaves at its foot.
 *
 * A screen inside the tab navigator must NOT add `insets.bottom`. The bar
 * sits below it in normal flow and is already `49 + insets.bottom` tall
 * with `paddingBottom: insets.bottom` of its own, so the home indicator is
 * covered before the screen's own padding begins. Nothing between
 * expo-router's single `SafeAreaProvider` and the screen re-provides a
 * reduced value — the tab view hands its scenes only
 * `BottomTabBarHeightContext`, and `SafeAreaProviderCompat` deliberately
 * renders a plain View rather than a second provider — so a screen that
 * adds the inset is asking for the same strip twice. That is how the chat
 * composer came to sit 46pt above the bar where its other three sides use
 * 16 (owner, 2026-09-14: "çok boşluk var").
 *
 * Outside the tabs there is nothing below the screen and the inset is
 * owed. A screen could be served both ways — `legal.tsx` once was, until
 * the signed-in copy moved into the settings sheet — which is why this
 * asks the navigator instead of taking either answer as given.
 *
 * `Popup` is the documented exception: a `Modal` is its own window, above
 * the tab bar, so nothing covers the home indicator for that sheet.
 */
export function useBottomGap(own: number): number {
  const insets = useSafeAreaInsets();
  // The context is defined for every screen the tab navigator renders and
  // undefined everywhere else, which is exactly the question being asked.
  const underTabBar = useContext(BottomTabBarHeightContext) !== undefined;
  return underTabBar ? own : insets.bottom + own;
}

/**
 * The clearance a screen keeps above its first child.
 *
 * It used to be a flat 68 (and a flat 64, and a flat 56, in the screens
 * that do their own layout). That number is a status bar's height, and it
 * is right on the phone, where the app owns the whole screen and has to
 * keep out from under it. In a browser it is 68 points of nothing: the
 * page starts *below* the browser's status bar, which has already made
 * that room, so the app adds the same clearance a second time. Measured
 * off the owner's screenshot on 2026-09-18: the matches title sat 126
 * points down a 849-point screen — a 54-point status bar, then 64 points
 * of ours, then the text (owner: "başlık çok altta").
 *
 * So it is asked for rather than assumed. `insets.top` is the status bar
 * where there is one and zero where the host has already cleared it, and
 * the gutter is the breathing room the design wants either way.
 *
 * `own` has no default on purpose. A default here and a constant in
 * `ui.tsx` would be two definitions of one number, and a change to either
 * would leave the other behind — which is exactly how 68, 64 and 56 came
 * to be three numbers for the same idea. Callers pass
 * `SCREEN_TOP_GUTTER`.
 */
export function useTopClearance(own: number): number {
  return useSafeAreaInsets().top + own;
}
