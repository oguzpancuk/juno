import {
  BODY_GLYPH,
  bodyName,
  PLANETS,
  SIGN_GLYPH,
  signName,
  degreeInSign,
  elementOf,
  signOf,
  formatDegree,
  natalAspectTitle,
  type NatalReading,
  type PlacementReading,
  type PublicChart,
} from '@juno/astro';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AspectGlyphs } from '@/components/AspectGlyphs';
import { ChartWheel } from '@/components/ChartWheel';
import { Body, Card, GlyphBadge, SectionLabel } from '@/components/ui';
import { t } from '@/lib/strings';
import {
  color,
  element,
  font,
  glass,
  planet,
  radius,
  space,
  type,
} from '@/theme/tokens';

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
  const { sign, label, text, houseText, house } = reading;
  const tone = element[elementOf(sign)];
  return (
    <Card {...(testID === undefined ? {} : { testID })}>
      <View style={styles.cardHead}>
        {/* The sign's symbol in its element's colour, the sign's name
            large, the product's title under it (sheet frame 07). The
            technical line — degree, house, retrograde — is the full
            chart's; the profile's three cards stay short. */}
        <GlyphBadge
          glyph={SIGN_GLYPH[sign]}
          size={44}
          ink={tone.ink}
          tint={tone.tint}
        />
        <View style={styles.cardHeadText}>
          <Text style={styles.cardTitle}>{signName(sign)}</Text>
          <Text style={styles.cardLabel}>
            {label}
            {house === null || degree ? '' : ` · ${t.chart.house(house)}`}
          </Text>
          {degree ? (
            <Text style={styles.cardTechnical}>{withDegree(reading)}</Text>
          ) : null}
        </View>
      </View>
      <Body>{text}</Body>
      {/* The sign says how; the house says where in a life it shows up.
          Both belong on the card — the house meant nothing while it was a
          number in a subtitle. */}
      {!degree ? null : houseText !== null ? (
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

      <ChartTables chart={chart} />

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
            <AspectGlyphs aspect={aspect} />
            <Text style={styles.planetName}>
              {natalAspectTitle(aspect)}
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

/**
 * The sheet's two tables under the wheel (frame 08): every planet with
 * its sign and degree, and every house cusp with the sign it starts in.
 * Read straight off the public chart — the placements list above them
 * is the same data explained; this is the same data tabulated.
 */
function ChartTables({ chart }: { chart: PublicChart }) {
  const [tab, setTab] = useState<'planets' | 'houses'>('planets');
  return (
    <View style={styles.tables} testID="chart-tables">
      <View style={styles.segments} role="tablist">
        {(['planets', 'houses'] as const).map((key) => {
          const on = tab === key;
          return (
            <Pressable
              key={key}
              role="tab"
              aria-selected={on}
              testID={`chart-tab-${key}`}
              style={[styles.segment, on && styles.segmentOn]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                {key === 'planets' ? t.chart.planetsTab : t.chart.housesTab}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Card style={styles.table}>
        {tab === 'planets'
          ? PLANETS.map((body) => {
              const p = chart.planets[body];
              return (
                <View key={body} style={styles.row} testID={`row-${body}`}>
                  <GlyphBadge
                    glyph={BODY_GLYPH[body]}
                    size={36}
                    ink={planet[body]}
                    tint={glass.fillHigh}
                  />
                  <Text style={styles.rowName}>{bodyName(body)}</Text>
                  <Text style={styles.rowSign}>
                    {SIGN_GLYPH[p.sign]} {signName(p.sign)}
                  </Text>
                  <Text style={styles.rowDegree}>
                    {formatDegree(p.degree)}
                    {p.retrograde ? ` ${t.chart.retrograde}` : ''}
                  </Text>
                </View>
              );
            })
          : chart.houses.cusps.map((cusp, index) => {
              const sign = signOf(cusp);
              const tone = element[elementOf(sign)];
              return (
                <View
                  key={index}
                  style={styles.row}
                  testID={`row-house-${index + 1}`}
                >
                  <GlyphBadge
                    glyph={SIGN_GLYPH[sign]}
                    size={36}
                    ink={tone.ink}
                    tint={tone.tint}
                  />
                  <Text style={styles.rowName}>{t.chart.house(index + 1)}</Text>
                  <Text style={styles.rowSign}>{signName(sign)}</Text>
                  <Text style={styles.rowDegree}>
                    {formatDegree(degreeInSign(cusp))}
                  </Text>
                </View>
              );
            })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  tables: { gap: space.sm, marginTop: space.sm },
  segments: {
    flexDirection: 'row',
    backgroundColor: glass.fillSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: glass.edge,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: space.sm,
  },
  segmentOn: { backgroundColor: color.cool },
  segmentText: { ...type.body, color: color.text },
  segmentTextOn: { color: color.onBright, fontFamily: font.semibold },
  table: { gap: space.xs, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
  },
  rowName: { ...type.body, color: color.text, width: 84 },
  rowSign: { ...type.body, color: color.textMuted, flex: 1 },
  rowDegree: { ...type.caption, color: color.textFaint },
  cardLabel: { ...type.bodySmall, color: color.textMuted, marginTop: 1 },
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
  orb: { ...type.caption, color: color.textFaint, fontFamily: font.regular },
});
