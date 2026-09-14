import { BODY_GLYPH, SIGN_GLYPH, SIGN_TR, type BigThree } from '@juno/astro';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/**
 * Sun, Moon and rising as three chips, each with the body's own glyph
 * (owner, 2026-09-11: the deck card carries the planet symbols the way
 * the person page does). One component so the deck, the match page and
 * another person's page cannot drift apart — the owner asked for the
 * three to look the same; the profile itself joins in Track B.
 */
const CELLS = [
  { key: 'sun', body: 'sun', label: () => t.chart.sun },
  { key: 'moon', body: 'moon', label: () => t.chart.moon },
  { key: 'rising', body: 'ascendant', label: () => t.chart.rising },
] as const;

export function BigThreeRow({
  three,
  maxFontSizeMultiplier,
}: {
  three: BigThree;
  /**
   * A ceiling on Dynamic Type, for a host that cannot scroll: the deck
   * card has to fit one screen, so text that grows without limit pushes
   * the photo out instead of pushing itself off the bottom. Undefined
   * everywhere else, which is uncapped.
   */
  maxFontSizeMultiplier?: number | undefined;
}) {
  return (
    <View style={styles.row}>
      {CELLS.map(({ key, body, label }) => {
        const sign = three[key];
        return (
          <View key={key} style={styles.chip} testID={`big-three-${key}`}>
            <Text
              style={styles.glyph}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {BODY_GLYPH[body]}
            </Text>
            <Text
              style={styles.label}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {label()}
            </Text>
            <Text
              style={styles.value}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {SIGN_GLYPH[sign]} {SIGN_TR[sign]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  chip: {
    flex: 1,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.md,
    alignItems: 'center',
    gap: 2,
  },
  glyph: { fontSize: 19, color: color.pink },
  label: { ...type.caption, color: color.textFaint },
  value: { ...type.bodySmall, color: color.text, fontWeight: '600' },
});
