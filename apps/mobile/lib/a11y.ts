import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Whether the person asked the system for less motion. The sky twinkles
 * and a star falls now and then; with this on it holds still. Starts
 * false and corrects itself on the first read — a frame of motion before
 * the setting lands is better than a sky that never moves for anyone
 * while the setting is fetched.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) setReduced(on);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * Say a screen's name to the screen reader when it takes focus.
 *
 * The three tab roots draw no heading any more (owner, 2026-09-14: "zaten
 * alt navigasyonda hangi sayfa olduğu belli"). The tab bar does announce
 * the page — but only when the tab button itself is what the user
 * activated, and three arrivals bypass it: a cold open, the replace out of
 * onboarding, and the programmatic tab switch a match arriving over
 * Realtime performs. Without this a VoiceOver user swiping down from the
 * top would hear a control or a row with no idea which page it is on.
 *
 * Pass the tab's own word, so what is spoken cannot drift from what the
 * bar reads.
 *
 * Web is excluded on purpose: react-native-web's `AccessibilityInfo` has
 * no `announceForAccessibilityWithOptions` at all, so the call would throw
 * rather than degrade. No screen-reader check either — the announce is a
 * no-op with VoiceOver off, and the check is a native round trip that buys
 * nothing.
 */
export function useScreenName(name: string): void {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      AccessibilityInfo.announceForAccessibilityWithOptions(name, {
        // Queued rather than interrupting: arriving on a tab often
        // coincides with the bar announcing the button that was pressed.
        queue: true,
      });
    }, [name]),
  );
}
