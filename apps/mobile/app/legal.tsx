import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LEGAL_UPDATED, legalSections } from '@/lib/legal';
import { useSession } from '@/lib/session';
import { useBottomGap } from '@/lib/insets';
import { t } from '@/lib/strings';
import { BackLink } from '@/components/ui';
import { color } from '@/theme/tokens';

const BULLET = '• ';

/**
 * The privacy notice and licence credits. Reachable without signing in:
 * on the web client this is the public URL the App Store listing needs,
 * and someone deciding whether to sign up has to be able to read it
 * first.
 */
export default function Legal() {
  // One component, two routes (see (tabs)/(profile)/settings/legal.tsx):
  // the tab bar covers the home indicator on /settings/legal and nothing
  // covers it on the root /legal, so this asks instead of assuming.
  const bottomGap = useBottomGap(32);
  // Reachable from sign-in as well as from settings, and a signed-out
  // reader cannot open settings at all. While the stored session is still
  // being read there is no honest answer, so no link is shown rather than
  // one that points at the wrong place and then changes.
  const session = useSession();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: bottomGap }]}
      testID="legal-screen"
    >
      {/* One label for both: the control pops to wherever the reader came
          from — settings, onboarding, welcome or sign-in — and a label
          naming one of them would be wrong for the others. Only the
          fallback, for a cold deep link, depends on the session. */}
      {session.status === 'signed-in' ? (
        <BackLink label={t.signIn.back} fallback="/settings" />
      ) : session.status === 'signed-out' ? (
        <BackLink label={t.signIn.back} fallback="/sign-in" />
      ) : null}
      <Text style={styles.updated}>{t.legal.updated(LEGAL_UPDATED)}</Text>
      {legalSections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          {section.body.map((line) =>
            line.startsWith(BULLET) ? (
              <View key={line} style={styles.bulletRow}>
                <Text style={styles.bullet}>{BULLET}</Text>
                <Text style={styles.bulletText}>
                  {line.slice(BULLET.length)}
                </Text>
              </View>
            ) : (
              <Text key={line} style={styles.paragraph}>
                {line}
              </Text>
            ),
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, paddingTop: 64, gap: 4, maxWidth: 720 },
  updated: { color: color.textFaint, fontSize: 12 },
  section: { marginTop: 20, gap: 8 },
  heading: { color: color.text, fontSize: 17, fontWeight: '700' },
  paragraph: { color: color.textMuted, fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 2 },
  bullet: { color: color.textMuted, fontSize: 14, lineHeight: 21 },
  bulletText: { color: color.textMuted, fontSize: 14, lineHeight: 21, flex: 1 },
});
