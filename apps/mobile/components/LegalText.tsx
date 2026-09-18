import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { LEGAL_UPDATED, legalSections } from '@/lib/legal';
import { Popup } from '@/components/Popup';
import { LinkText } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, font } from '@/theme/tokens';

const BULLET = '• ';

/**
 * The privacy notice and licence credits, without a screen around them.
 * Three hosts: the root `/legal` page, which is the notice's public URL and
 * the one the App Store listing points at; the settings sheet (owner,
 * 2026-09-15); and `LegalLink` below, which is how the three doors show it.
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

/**
 * The "Gizlilik ve lisanslar" link on the doors — welcome, sign-in and
 * onboarding.
 *
 * It opens the notice as a sheet rather than navigating to `/legal`
 * (owner, 2026-09-17: "gizlilik metni popup olarak açılsın"). Reading it
 * is a detour, not a destination: someone halfway through onboarding has
 * eight fields typed in, and a route change used to take them off that
 * screen and bring them back to an empty one. A sheet leaves the form
 * standing underneath.
 *
 * `/legal` stays exactly as it was. It is the public address of the
 * notice, which the store listing and the notice itself both cite, and a
 * sheet has no URL.
 */
export function LegalLink({
  label = t.legal.open,
  style,
  testID = 'open-legal-link',
}: {
  label?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LinkText testID={testID} style={style} onPress={() => setOpen(true)}>
        {label}
      </LinkText>
      <Popup
        visible={open}
        onClose={() => setOpen(false)}
        title={t.legal.open}
        testID="legal-popup"
      >
        <LegalText />
      </Popup>
    </>
  );
}
