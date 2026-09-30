import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ErrorRetry } from '@/components/ErrorRetry';
import { markConsentAsked, markConsentCurrent } from '@/lib/consent';
import { needsConsent } from '@/lib/consent-rules';
import { LEGAL_VERSION } from '@/lib/legal';
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
      if (cancelled) return;
      // Known either way: the tabs' gate, or `/consent`, need not read the
      // record again.
      if (state.status === 'ready') {
        if (needsConsent(state.profile.consent_version, LEGAL_VERSION))
          markConsentAsked(userId);
        else markConsentCurrent(userId);
      }
      setProfile(state);
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
    // A member whose record names an older notice accepts the current one
    // before anything else (KVKK re-consent, lib/consent.ts).
    if (needsConsent(profile.profile.consent_version, LEGAL_VERSION))
      return <Redirect href="/consent" />;
    return <Redirect href="/discover" />;
  }
  if (profile.status === 'error') {
    return (
      <ErrorRetry
        retryTestID="retry"
        onRetry={() => {
          setProfile({ status: 'loading' });
          setAttempt((n) => n + 1);
        }}
      />
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
});
