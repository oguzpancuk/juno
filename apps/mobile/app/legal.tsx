import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEGAL_UPDATED, legalSections } from '@/lib/legal';
import { t } from '@/lib/strings';

const BULLET = '• ';

/**
 * The privacy notice and licence credits. Reachable without signing in:
 * on the web client this is the public URL the App Store listing needs,
 * and someone deciding whether to sign up has to be able to read it
 * first.
 */
export default function Legal() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      testID="legal-screen"
    >
      <Link href="/settings" style={styles.back}>
        {t.legal.back}
      </Link>
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
  screen: { flex: 1, backgroundColor: '#0b0b1a' },
  content: { padding: 24, paddingTop: 64, gap: 4, maxWidth: 720 },
  back: { color: '#9a94b8', fontSize: 14 },
  updated: { color: '#5f5a7a', fontSize: 12 },
  section: { marginTop: 20, gap: 8 },
  heading: { color: '#f5f2ff', fontSize: 17, fontWeight: '700' },
  paragraph: { color: '#c8c3e0', fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 2 },
  bullet: { color: '#9a94b8', fontSize: 14, lineHeight: 21 },
  bulletText: { color: '#c8c3e0', fontSize: 14, lineHeight: 21, flex: 1 },
});
