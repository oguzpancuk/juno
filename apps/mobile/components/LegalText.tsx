import { StyleSheet, Text, View } from 'react-native';
import { LEGAL_UPDATED, legalSections } from '@/lib/legal';
import { t } from '@/lib/strings';
import { color, font } from '@/theme/tokens';

const BULLET = '• ';

/**
 * The privacy notice and licence credits, without a screen around them.
 * Two hosts: the root `/legal` page, for someone not signed in yet, and the
 * settings sheet (owner, 2026-09-15), for someone who is.
 */
export function LegalText() {
  return (
    <View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  updated: { fontFamily: font.regular, color: color.textFaint, fontSize: 12 },
  section: { marginTop: 20, gap: 8 },
  heading: { color: color.text, fontSize: 17, fontFamily: font.semibold },
  paragraph: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  bulletRow: { flexDirection: 'row', gap: 2 },
  bullet: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  bulletText: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
});
