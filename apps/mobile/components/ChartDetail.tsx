import {
  BODY_GLYPH,
  aspectGlyphs,
  formatDegree,
  natalAspectTitleTr,
  type NatalReading,
  type PlacementReading,
  type PublicChart,
} from '@juno/astro';
import { StyleSheet, Text, View } from 'react-native';
import { ChartWheel } from '@/components/ChartWheel';
import { Body, Card, GlyphBadge, SectionLabel } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, font, space, type } from '@/theme/tokens';

/**
 * How many of `reading.placements` the profile page shows in the open —
 * Sun, Moon and Ascendant, the three the owner named (Çekirdek benlik,
 * Duygusal dünya, İlk izlenim). The popup below continues the same list
 * from the top rather than from here: a chart read once, end to end
 * (owner, 2026-09-11).
 */
export const PROFILE_PRIMARY_COUNT = 3;

/**
 * One placement, titled by what it means for dating. The astrology stays
 * under the label, never instead. The profile page and the popup render
 * the same component, so a card cannot look one way on the page and
 * another way behind the button.
 */
export function PlacementCard({
  reading,
  own,
  degree = false,
  testID,
}: {
  reading: PlacementReading;
  /** Whose chart: the Ascendant's no-house note is addressed differently. */
  own: boolean;
  /**
   * Put the degree and the retrograde mark in the technical line. The
   * popup does; the profile's three cards stay as short as they were.
   */
  degree?: boolean;
  testID?: string | undefined;
}) {
  const { placement, label, technical, text, houseText, house } = reading;
  return (
    <Card {...(testID === undefined ? {} : { testID })}>
      <View style={styles.cardHead}>
        <GlyphBadge glyph={BODY_GLYPH[placement]} />
        <View style={styles.cardHeadText}>
          <Text style={styles.cardTitle}>{label}</Text>
          <Text style={styles.cardTechnical}>
            {degree ? withDegree(reading) : technical}
          </Text>
        </View>
      </View>
      <Body>{text}</Body>
      {/* The sign says how; the house says where in a life it shows up.
          Both belong on the card — the house meant nothing while it was a
          number in a subtitle. */}
      {houseText !== null ? (
        <View style={styles.houseBlock}>
          <Text style={styles.houseLabel}>
            {t.chart.houseMeaning(house ?? 1)}
          </Text>
          <Body small>{houseText}</Body>
        </View>
      ) : (
        // The Ascendant is the only card without a house, and saying so
        // is better than a card that is simply shorter than the others
        // for no visible reason.
        <View style={styles.houseBlock}>
          <Text style={styles.houseLabel}>{t.chart.housesLabel}</Text>
          <Body small>
            {own ? t.chart.risingHasNoHouse : t.chart.risingHasNoHouseTheirs}
          </Body>
        </View>
      )}
      {reading.retrogradeText === null ? null : (
        <Body small>{reading.retrogradeText}</Body>
      )}
    </Card>
  );
}

/**
 * "Venüs Akrep'te 12°34′ · 7. ev · retro" — the technical line with
 * everything the popup's deleted PLANETLER list used to carry. The degree
 * goes after the sign, where an astrologer reads it; the house keeps the
 * end of the line.
 */
function withDegree(reading: PlacementReading): string {
  const [sign, house] = reading.technical.split(' · ');
  const retro =
    reading.retrogradeText === null ? '' : ` · ${t.chart.retrograde}`;
  const head = `${sign ?? reading.technical} ${reading.degree}`;
  return house === undefined ? `${head}${retro}` : `${head} · ${house}${retro}`;
}

/**
 * The whole chart, as the body of the "tüm haritanı gör" popup: the wheel,
 * then every body in one pass from the Sun down — the same card the
 * profile shows its first three in, repeated rather than continued, so
 * the chart reads once from the start (owner, 2026-09-11) — then the
 * aspects. Nothing here knows whose chart it is beyond the one note on
 * the Ascendant.
 */
export function ChartDetail({
  reading,
  chart,
  own,
}: {
  reading: NatalReading;
  chart: PublicChart;
  own: boolean;
}) {
  return (
    <>
      <View style={styles.wheelWrap} testID="chart-wheel">
        {/* The same aspects as the list below, so a line on the wheel
            always has a card to explain it. */}
        <ChartWheel
          chart={chart}
          aspects={reading.aspects.map((a) => a.aspect)}
          size={300}
        />
      </View>

      <SectionLabel>{t.chart.placements}</SectionLabel>
      {reading.placements.map((placement) => (
        <PlacementCard
          key={placement.placement}
          reading={placement}
          own={own}
          degree
          testID={`primary-${placement.placement}`}
        />
      ))}

      <SectionLabel>{t.chart.aspects}</SectionLabel>
      {reading.aspects.length === 0 ? (
        <Body muted>{t.chart.noAspects}</Body>
      ) : (
        reading.aspects.map(({ aspect, text }) => (
          <Card
            key={`${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}
            testID={`aspect-${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}
          >
            <Text style={styles.aspectGlyphs}>{aspectGlyphs(aspect)}</Text>
            <Text style={styles.planetName}>
              {natalAspectTitleTr(aspect)}
              <Text style={styles.orb}>
                {' '}
                · {t.chart.orb(formatDegree(aspect.orb))}
              </Text>
            </Text>
            <Body>{text}</Body>
          </Card>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  cardHeadText: { flexShrink: 1 },
  cardTitle: { ...type.heading, color: color.text },
  cardTechnical: { ...type.caption, color: color.textMuted, marginTop: 2 },
  houseBlock: {
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: space.md,
    marginTop: space.xs,
    gap: 2,
  },
  houseLabel: { ...type.label, color: color.textFaint },
  wheelWrap: { alignItems: 'center', paddingVertical: space.sm },
  planetName: { ...type.body, color: color.text, fontFamily: font.semibold },
  aspectGlyphs: { fontSize: 17, color: color.pink, letterSpacing: 2 },
  orb: { ...type.caption, color: color.textFaint, fontFamily: font.regular },
});
