import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { useMatchListener } from '@/lib/matches';
import { useSession } from '@/lib/session';

export default function RootLayout() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const onMatch = useCallback((matchId: string) => {
    router.navigate({ pathname: '/match/[id]', params: { id: matchId } });
  }, []);
  useMatchListener(userId, onMatch);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0b0b1a' },
        }}
      />
      <StatusBar style="light" />
    </>
  );
}
