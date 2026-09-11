import { Stack, router } from 'expo-router';
import { color } from '@/theme/tokens';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { useMatchListener } from '@/lib/matches';
import { matchDetailHref } from '@/lib/routes';
import { useSession } from '@/lib/session';

export default function RootLayout() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const onMatch = useCallback((matchId: string) => {
    router.navigate(matchDetailHref(matchId));
  }, []);
  useMatchListener(userId, onMatch);

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
