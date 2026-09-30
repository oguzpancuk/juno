import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { SOURCE_LANGUAGE } from '@juno/astro';
import { CATALOGS } from '@/lib/i18n';
import { LEGAL_SECTIONS, LEGAL_UPDATED_IN } from '@/lib/legal';
import { useLanguage } from '@/lib/language';
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
  const { language } = useLanguage();
  // A translation says first that the Turkish binds, and offers it: the
  // Turkish is what the member consented to (`lib/legal.ts`).
  const [original, setOriginal] = useState(false);
  const translated = language !== SOURCE_LANGUAGE;
  const shown = translated && !original ? language : SOURCE_LANGUAGE;
  return (
    <View>
      <Text style={styles.updated}>
        {/* In the language of the text under it, the original's own
            date included. */}
        {CATALOGS[shown].legal.updated(LEGAL_UPDATED_IN[shown])}
      </Text>
      {translated ? (
        <View style={styles.note} testID="legal-translation-note">
          <Text style={styles.paragraph}>{t.legal.translationNote}</Text>
          <LinkText
            testID="legal-toggle-original"
            onPress={() => setOriginal((on) => !on)}
          >
            {original ? t.legal.showTranslation : t.legal.showOriginal}
          </LinkText>
        </View>
      ) : null}
      {LEGAL_SECTIONS[shown].map((section) => (
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
  note: { marginTop: 12, gap: 6 },
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
