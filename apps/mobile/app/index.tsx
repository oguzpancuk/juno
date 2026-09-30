import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchOwnProfile, type ProfileState } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, font } from '@/theme/tokens';

/** Entry: route by auth + profile state. */
export default function Index() {
  const session = useSession();
  const [profile, setProfile] = useState<ProfileState>({ status: 'loading' });

  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [attempt, setAttempt] = useState(0);

  // Keyed on the user id, not the session object: token refreshes must not
  // refetch the profile.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((state) => {
      if (!cancelled) setProfile(state);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  if (session.status === 'signed-out') return <Redirect href="/welcome" />;
  if (session.status === 'signed-in' && profile.status === 'missing') {
    return <Redirect href="/onboarding" />;
  }
  if (session.status === 'signed-in' && profile.status === 'ready') {
    return <Redirect href="/discover" />;
  }
  if (profile.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t.errors.generic}</Text>
        <Pressable
          testID="retry"
          onPress={() => {
            setProfile({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          <Text style={styles.link}>{t.common.retry}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <ActivityIndicator color={color.textMuted} />
      <Text style={styles.text}>{t.common.loading}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontFamily: font.regular, color: color.textMuted },
  link: { fontFamily: font.regular, color: color.textMuted, padding: 12 },
});
