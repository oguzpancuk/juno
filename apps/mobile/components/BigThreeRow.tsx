import { SIGN_GLYPH, signName, elementOf, type BigThree } from '@juno/astro';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/lib/strings';
import { color, element, font, radius, space, type } from '@/theme/tokens';

/**
 * Sun, Moon and rising across one row, three equal cells: the sign's
 * symbol large in a circle tinted with its element's colour, the sign's
 * name beside it and the body's word under that (owner, 2026-09-16: "daha
 * büyük olup satırı kaplamalı", like the sheet's chart page, frame 07 —
 * which replaced the pill form of the same morning). One component so the
 * deck, the match page and another person's page cannot drift apart. Each
 * cell is one spoken element: "Güneş Koç".
 */
const CELLS = [
  { key: 'sun', label: () => t.chart.sun },
  { key: 'moon', label: () => t.chart.moon },
  { key: 'rising', label: () => t.chart.rising },
] as const;

/** The circle; the glyph inside is sized to it. */
const BADGE = 40;

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
    <View style={styles.row} role="list">
      {CELLS.map(({ key, label }) => {
        const sign = three[key];
        const tone = element[elementOf(sign)];
        return (
          <View
            key={key}
            style={styles.cell}
            testID={`big-three-${key}`}
            accessible
            role="listitem"
            aria-label={`${label()} ${signName(sign)}`}
          >
            <View style={[styles.badge, { backgroundColor: tone.tint }]}>
              <Text
                style={[styles.glyph, { color: tone.ink }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {SIGN_GLYPH[sign]}
              </Text>
            </View>
            <View style={styles.words}>
              <Text
                style={styles.sign}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {signName(sign)}
              </Text>
              {/* Fits itself like the sign: "Yükselen" at a large text
                  size is wider than a third of a small phone (review,
                  2026-09-16). No cushion on the web, where fit is a no-op. */}
              <Text
                style={styles.body}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {label()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  // Equal parts of the row, so the three fill it end to end.
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The system face: Outfit has no zodiac glyphs, and naming it would
  // only route the fallback through one more font.
  glyph: { fontSize: 22, lineHeight: 26 },
  words: { flexShrink: 1, gap: 1 },
  sign: { ...type.bodySmall, fontFamily: font.semibold, color: color.text },
  body: { ...type.caption, color: color.textFaint },
});
