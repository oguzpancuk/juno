import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEGAL_UPDATED, legalSections } from '@/lib/legal';
import { useSession } from '@/lib/session';
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
  const insets = useSafeAreaInsets();
  // Reachable from sign-in as well as from settings, and a signed-out
  // reader cannot open settings at all. While the stored session is still
  // being read there is no honest answer, so no link is shown rather than
  // one that points at the wrong place and then changes.
  const session = useSession();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      testID="legal-screen"
    >
      {session.status === 'signed-in' ? (
        <BackLink label={t.legal.back} fallback="/settings" />
      ) : session.status === 'signed-out' ? (
        <Link href="/sign-in" style={styles.back}>
          {t.legal.backToSignIn}
        </Link>
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
  back: { color: color.textMuted, fontSize: 14 },
  updated: { color: color.textFaint, fontSize: 12 },
  section: { marginTop: 20, gap: 8 },
  heading: { color: color.text, fontSize: 17, fontWeight: '700' },
  paragraph: { color: color.textMuted, fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 2 },
  bullet: { color: color.textMuted, fontSize: 14, lineHeight: 21 },
  bulletText: { color: color.textMuted, fontSize: 14, lineHeight: 21, flex: 1 },
});
