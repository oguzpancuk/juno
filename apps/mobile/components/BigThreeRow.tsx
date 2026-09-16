import { BODY_GLYPH, SIGN_TR, type BigThree } from '@juno/astro';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/lib/strings';
import { color, font, radius, space, type } from '@/theme/tokens';

/**
 * Sun, Moon and rising as three pills, each the body's own glyph and the
 * sign's name (owner, 2026-09-11: the deck card carries the planet
 * symbols the way the person page does; the sheet's frames 05 and 06 set
 * the pill form, ROADMAP D3). One component so the deck, the match page
 * and another person's page cannot drift apart — the owner asked for the
 * three to look the same. The word for the body is not drawn — the glyph
 * is the whole point of the pill — but it is spoken: each pill is one
 * element labelled "Güneş Koç". A list of items, so the DOM has a role to
 * hang the label on — a label on a bare div is dropped by every web
 * screen reader (review, 2026-09-16); on iOS the roles add no trait.
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
    <View style={styles.row} role="list">
      {CELLS.map(({ key, body, label }) => {
        const sign = three[key];
        return (
          <View
            key={key}
            style={styles.pill}
            testID={`big-three-${key}`}
            accessible
            role="listitem"
            aria-label={`${label()} ${SIGN_TR[sign]}`}
          >
            <Text
              style={styles.glyph}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {BODY_GLYPH[body]}
            </Text>
            <Text
              style={styles.value}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {SIGN_TR[sign]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  glyph: { fontSize: 16, color: color.pink },
  value: { ...type.bodySmall, color: color.text, fontFamily: font.semibold },
});
