import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchOwnProfile, type ProfileState } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';

/** Entry: route by auth + profile state. */
export default function Index() {
  const session = useSession();
  const [profile, setProfile] = useState<ProfileState>({ status: 'loading' });

  useEffect(() => {
    if (session.status !== 'signed-in') return;
    let cancelled = false;
    void fetchOwnProfile(session.session.user.id).then((state) => {
      if (!cancelled) setProfile(state);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;
  if (session.status === 'signed-in' && profile.status === 'missing') {
    return <Redirect href="/onboarding" />;
  }
  if (session.status === 'signed-in' && profile.status === 'ready') {
    return <Redirect href="/chart" />;
  }
  return (
    <View style={styles.center}>
      <ActivityIndicator color="#9a94b8" />
      <Text style={styles.text}>
        {profile.status === 'error' ? profile.message : t.common.loading}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { color: '#9a94b8' },
});
