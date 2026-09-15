import { ScrollView, StyleSheet } from 'react-native';
import { useSession } from '@/lib/session';
import { useBottomGap } from '@/lib/insets';
import { t } from '@/lib/strings';
import { BackLink } from '@/components/ui';
import { LegalText } from '@/components/LegalText';
import { color } from '@/theme/tokens';

/**
 * The privacy notice and licence credits. Reachable without signing in:
 * on the web client this is the public URL the App Store listing needs,
 * and someone deciding whether to sign up has to be able to read it
 * first. A signed-in person reads the same text inside the settings sheet.
 */
export default function Legal() {
  // Outside the tabs, so nothing covers the home indicator.
  const bottomGap = useBottomGap(32);
  // Reachable from sign-in, onboarding and welcome. While the stored
  // session is still being read there is no honest fallback, so no link is
  // shown rather than one that points at the wrong place and then changes.
  const session = useSession();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: bottomGap }]}
      testID="legal-screen"
    >
      {/* One label for all: the control pops to wherever the reader came
          from, and a label naming one of them would be wrong for the
          others. Only the fallback, for a cold deep link, depends on the
          session. */}
      {session.status === 'signed-in' ? (
        <BackLink label={t.signIn.back} fallback="/profile" />
      ) : session.status === 'signed-out' ? (
        <BackLink label={t.signIn.back} fallback="/sign-in" />
      ) : null}
      <LegalText />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, paddingTop: 64, gap: 4, maxWidth: 720 },
});
