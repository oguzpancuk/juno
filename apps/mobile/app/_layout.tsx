import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { color } from '@/theme/tokens';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { isConsentKnownCurrent } from '@/lib/consent';
import { holdMatch } from '@/lib/held-matches';
import { firstSightOf, useMatchListener } from '@/lib/matches';
import { INTO_MATCHES, matchArrivedHref } from '@/lib/routes';
import { useSession } from '@/lib/session';

// The splash stays up until the faces are in: a first frame in the system
// font that then snaps to Outfit reads as a glitch. `useFonts` resolves
// once per app run and never throws — a face that fails to load leaves
// `loaded` false with the error in the second slot — so the gate is
// released on either, and a failure is a system-font app, not a blank one.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const onMatch = useCallback(
    (matchId: string) => {
      if (!userId) return;
      // Not over `/consent`, and not before the member is known to be on
      // the current notice (lib/consent.ts): the tabs would open on top of
      // the consent screen. The insert fires once, so the match is held,
      // with its reveal unspent, and the tabs show it when their gate
      // answers `current` (app/(tabs)/_layout.tsx).
      if (!isConsentKnownCurrent(userId)) {
        holdMatch(userId, matchId);
        return;
      }
      if (firstSightOf(matchId))
        router.navigate(matchArrivedHref(matchId), INTO_MATCHES);
    },
    [userId],
  );
  useMatchListener(userId, onMatch);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
        }}
      />
      <StatusBar style="light" />
    </>
  );
}
