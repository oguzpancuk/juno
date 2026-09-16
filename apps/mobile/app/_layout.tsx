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
import { useMatchListener } from '@/lib/matches';
import { INTO_MATCHES, matchDetailHref } from '@/lib/routes';
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
  const onMatch = useCallback((matchId: string) => {
    router.navigate(matchDetailHref(matchId), INTO_MATCHES);
  }, []);
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
