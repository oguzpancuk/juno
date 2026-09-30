import { Stack } from 'expo-router';
import { useContext } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConsentGateContext } from '@/lib/consent';
import { t } from '@/lib/strings';
import { color, font } from '@/theme/tokens';

/**
 * The stack inside each tab. Every signed-in screen is pushed onto one of
 * these rather than onto the root, so the tab bar stays under it — the
 * owner's rule of 2026-09-11 that the bar is on every page — and the root
 * stack holds exactly one signed-in route, `(tabs)`. That second property
 * is what lets `leaveToSignIn` leave nothing signed-in under sign-in
 * (docs/NOTES.md 2026-09-11, the two-navigator bug). It holds as long as
 * no handler makes two router calls into the tab tree at once; see
 * app/onboarding.tsx for why.
 *
 * One component rather than three copies, because a nested native stack
 * with no `contentStyle` flashes white between pushes and the omission
 * would be silent.
 *
 * It is also where the notice gate holds (lib/consent.ts): while the
 * tabs have not yet heard that the member's record is current, every
 * screen of the stack is a spinner, or the entry screen's error and
 * retry when the record could not be read. The stack itself mounts at once, so
 * it takes the URL's route; only the screen waits.
 */
export function TabStack() {
  const { gate, retry } = useContext(ConsentGateContext);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
      screenLayout={({ children }) =>
        gate === 'current' ? (
          <>{children}</>
        ) : gate === 'error' ? (
          <View style={styles.waiting} testID="consent-gate-error">
            <Text style={styles.text}>{t.errors.generic}</Text>
            <Pressable
              testID="consent-gate-retry"
              role="button"
              onPress={retry}
            >
              <Text style={styles.link}>{t.common.retry}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.waiting} testID="consent-gate">
            <ActivityIndicator color={color.textMuted} />
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  waiting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: color.bg,
  },
  // The entry screen's error and retry, so the two doors read the same.
  text: { fontFamily: font.regular, color: color.textMuted },
  link: { fontFamily: font.regular, color: color.textMuted, padding: 12 },
});
