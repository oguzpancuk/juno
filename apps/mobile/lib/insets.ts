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
 * owed. `legal.tsx` is the only file that is both — it is the default
 * export for the root `/legal` and for `/settings/legal` — which is why
 * this asks the navigator instead of taking either answer as given.
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
