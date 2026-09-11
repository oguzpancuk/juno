import {
  BODY_GLYPH,
  PLANET_TR,
  PRIMARY_PLACEMENTS,
  SIGN_GLYPH,
  SIGN_TR,
  aspectGlyphs,
  formatDegree,
  natalAspectTitleTr,
  type NatalReading,
  type PrimaryReading,
  type PublicChart,
} from '@juno/astro';
import { StyleSheet, Text, View } from 'react-native';
import { ChartWheel } from '@/components/ChartWheel';
import { Body, Card, SectionLabel } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/**
 * How many of `reading.primary` the profile page shows in the open —
 * Sun, Moon and Ascendant, the three the owner named (Çekirdek benlik,
 * Duygusal dünya, İlk izlenim). The rest wait in the popup below.
 */
export const PROFILE_PRIMARY_COUNT = 3;

/**
 * One of the six placements, titled by what it means for dating. The
 * astrology stays under the label, never instead. Shared by the profile
 * page (the first three) and the popup (the other three) so the two
 * cannot drift apart.
 */
export function PrimaryCard({
  reading,
  own,
  testID,
}: {
  reading: PrimaryReading;
  /** Whose chart: the Ascendant's no-house note is addressed differently. */
  own: boolean;
  testID?: string | undefined;
}) {
  const { placement, label, technical, text, houseText, house } = reading;
  return (
    <Card {...(testID === undefined ? {} : { testID })}>
      <View style={styles.cardHead}>
        <View style={styles.glyphBadge}>
          <Text style={styles.glyph}>{BODY_GLYPH[placement]}</Text>
        </View>
        <View style={styles.cardHeadText}>
          <Text style={styles.cardTitle}>{label}</Text>
          <Text style={styles.cardTechnical}>{technical}</Text>
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
    </Card>
  );
}

/**
 * The whole chart, as the body of the "tüm haritanı gör" popup: the
 * wheel, the three primary cards the page did not show (Mercury, Venus,
 * Mars — kept, so no reading is lost; owner default of 2026-09-11), every
 * planet with its sign, degree and house, then the aspects. Nothing here
 * knows whose chart it is beyond the one note on the Ascendant.
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

      {reading.primary.slice(PROFILE_PRIMARY_COUNT).map((primary) => (
        <PrimaryCard
          key={primary.placement}
          reading={primary}
          own={own}
          testID={`primary-${primary.placement}`}
        />
      ))}

      <SectionLabel>{t.chart.planets}</SectionLabel>
      {reading.planets.map(
        ({ planet, signText, houseText, retrogradeText }) => {
          const p = chart.planets[planet];
          // The six primaries already carry their sign reading; repeating it
          // here is the duplication the popup exists to avoid.
          const isPrimary = (PRIMARY_PLACEMENTS as readonly string[]).includes(
            planet,
          );
          return (
            <Card key={planet} testID={`planet-${planet}`}>
              <View style={styles.rowBetween}>
                <Text style={styles.planetName}>
                  {BODY_GLYPH[planet]} {PLANET_TR[planet]}
                </Text>
                <Text style={styles.planetPos}>
                  {SIGN_GLYPH[p.sign]} {SIGN_TR[p.sign]}{' '}
                  {formatDegree(p.degree)} · {p.house}. {t.chart.house}
                  {p.retrograde ? ` ${t.chart.retrograde}` : ''}
                </Text>
              </View>
              {isPrimary ? null : <Body>{signText}</Body>}
              {/* Labelled here too. Unlabelled it reads as the planet's own
                meaning — and on the six primaries, whose sign reading is
                hidden as a duplicate, it is the only paragraph on the card. */}
              <View style={styles.houseBlock}>
                <Text style={styles.houseLabel}>
                  {t.chart.houseMeaning(p.house)}
                </Text>
                <Body small>{houseText}</Body>
              </View>
              {retrogradeText ? <Body small>{retrogradeText}</Body> : null}
            </Card>
          );
        },
      )}

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
  glyphBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceHigh,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 19, color: color.pink },
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  planetName: { ...type.body, color: color.text, fontWeight: '600' },
  planetPos: {
    ...type.bodySmall,
    color: color.textMuted,
    textAlign: 'right',
    flexShrink: 1,
  },
  aspectGlyphs: { fontSize: 17, color: color.pink, letterSpacing: 2 },
  orb: { ...type.caption, color: color.textFaint, fontWeight: '400' },
});
