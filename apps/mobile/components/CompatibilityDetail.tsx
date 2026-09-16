import {
  LEVELS,
  formatDegree,
  type MatchSections,
  type OverlayReading,
  type SynastryAspectReading,
  type SynastryReading,
} from '@juno/astro';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AspectGlyphs } from '@/components/AspectGlyphs';
import { Card } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, font, gradient, radius, space, type } from '@/theme/tokens';

/**
 * Everything the engine says about a pair below the band word: the band's
 * sentence, the dimensions, the aspects, the house overlays and the
 * elements. The band word and its meter are the caller's — the deck card
 * shows them whether or not the detail is open, so they cannot live here.
 *
 * With `sections` the aspects are the match page's two sections ("why
 * you're drawn", "where it gets interesting", ADR-0009 §5); without them
 * they are the reading's strongest few, the way the deck shows them.
 * Overlays are shown one card at a time behind a disclosure, as on the
 * match page.
 *
 * Nothing here computes astrology: it lays out what `synastryReading`,
 * `matchSections` and `houseOverlays` return.
 */
export function CompatibilityDetail({
  reading,
  sections,
  overlays = [],
  testID,
}: {
  reading: SynastryReading;
  sections?: MatchSections;
  overlays?: readonly OverlayReading[];
  testID?: string;
}) {
  const [showOverlays, setShowOverlays] = useState(false);
  return (
    <View style={styles.root} {...(testID === undefined ? {} : { testID })}>
      <Text style={styles.body}>{reading.bandText}</Text>

      {reading.dimensions.length === 0 ? null : (
        <>
          <Text style={styles.label}>{t.match.dimensions}</Text>
          {/* One row per dimension, the sheet's bars (frame 10): the name,
              a track filled to the level, the level's word. Thirds, not
              a number — the level has three steps and the fill is the
              step, so no figure reaches a Text (ADR-0009). */}
          <View role="list" style={styles.dimensions}>
            {reading.dimensions.map((d) => (
              <View
                key={d.dimension}
                style={styles.dimensionRow}
                testID={`dimension-${d.dimension}`}
                accessible
                role="listitem"
                aria-label={`${d.name}: ${d.label}`}
              >
                <Text style={styles.dimensionName} numberOfLines={2}>
                  {d.name}
                </Text>
                <View style={styles.track}>
                  <LinearGradient
                    colors={[...gradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.fill,
                      {
                        width: `${((LEVELS.indexOf(d.level) + 1) / LEVELS.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                {/* Two lines, not one: this word is the dimension's whole
                    value (ADR-0009 §2), and at a large text size a one-line
                    box would cut it to "Kolay yakın…" (review, 2026-09-16). */}
                <Text style={styles.dimensionLevel} numberOfLines={2}>
                  {d.label}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {sections === undefined ? (
        reading.aspects.map((a) => (
          <View key={aspectKey(a)} style={styles.aspectLine}>
            <Text style={styles.label}>{a.headline}</Text>
            <Text style={styles.body}>{a.meaning}</Text>
          </View>
        ))
      ) : (
        <>
          {/* A section with nothing to show is omitted with its heading,
              never padded and never filled with a verdict (ADR-0009 §5). */}
          {sections.drawn.length > 0 ? (
            <View testID="drawn">
              <Text style={styles.label}>{t.match.drawn}</Text>
              {sections.drawn.map((a) => (
                <AspectCard key={aspectKey(a)} card={a} />
              ))}
            </View>
          ) : null}
          {sections.interesting.length > 0 ? (
            <View testID="interesting">
              <Text style={styles.label}>{t.match.interesting}</Text>
              {sections.interesting.map((a) => (
                <AspectCard key={aspectKey(a)} card={a} />
              ))}
            </View>
          ) : null}
        </>
      )}

      {overlays.length > 0 ? (
        <View testID="overlays">
          <Text style={styles.label}>{t.match.overlays}</Text>
          {(showOverlays ? overlays : overlays.slice(0, 1)).map((o) => (
            <Card
              key={`${o.direction}-${o.house}`}
              style={styles.aspect}
              testID={`overlay-${o.direction}-${o.house}`}
            >
              <Text style={styles.aspectTitle}>{o.theme}</Text>
              <Text style={styles.aspectHead}>
                {o.direction === 'theirs'
                  ? t.match.overlayTheirs
                  : t.match.overlayYours}
              </Text>
              {o.placements.map((placement) => (
                <Text key={placement.planet} style={styles.body}>
                  {placement.text}
                </Text>
              ))}
            </Card>
          ))}
          {overlays.length > 1 ? (
            <Pressable
              testID="toggle-overlays"
              accessibilityRole="button"
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              onPress={() => setShowOverlays((v) => !v)}
            >
              <Text style={styles.link}>
                {showOverlays
                  ? t.match.fewerOverlays
                  : t.match.moreOverlays(overlays.length - 1)}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.label}>{t.match.elements}</Text>
      <Text style={styles.bodyMuted}>{reading.sunElements}</Text>
      <Text style={styles.bodyMuted}>{reading.moonElements}</Text>
    </View>
  );
}

/**
 * The sheet's aspect card (frames 11 and 12): the glyphs in a pill with
 * the orb to the arcminute beside them — the calculation, first — then
 * the title, the headline that names the two planets, and the reading.
 */
function AspectCard({ card }: { card: SynastryAspectReading }) {
  return (
    <Card style={styles.aspect}>
      <View style={styles.aspectTop}>
        <AspectGlyphs aspect={card.aspect} />
        <Text style={styles.aspectOrb}>{formatDegree(card.aspect.orb)}</Text>
      </View>
      <Text style={styles.aspectTitle}>{card.title}</Text>
      <Text style={styles.aspectHead}>{card.headline}</Text>
      <Text style={styles.body}>{card.meaning}</Text>
    </Card>
  );
}

function aspectKey(a: SynastryAspectReading): string {
  return `${a.aspect.planetA}-${a.aspect.aspect}-${a.aspect.planetB}`;
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  label: {
    ...type.label,
    color: color.textFaint,
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  body: { ...type.body, color: color.text },
  bodyMuted: { ...type.bodySmall, color: color.textMuted },
  dimensions: { gap: space.sm },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
  },
  // The name and the word take fixed widths so the five tracks line up.
  dimensionName: { ...type.bodySmall, color: color.textMuted, width: 104 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  dimensionLevel: {
    ...type.caption,
    color: color.textFaint,
    width: 92,
    textAlign: 'right',
  },
  aspectLine: { gap: 2 },
  aspect: { gap: space.xs, marginBottom: space.sm },
  aspectTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  aspectTitle: { ...type.heading, color: color.text },
  aspectOrb: {
    ...type.caption,
    fontFamily: font.medium,
    color: color.textMuted,
  },
  aspectHead: { ...type.caption, color: color.textMuted },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
});
