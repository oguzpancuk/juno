import {
  aspectGlyphs,
  formatDegree,
  type MatchSections,
  type OverlayReading,
  type SynastryAspectReading,
  type SynastryReading,
} from '@juno/astro';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LevelMeter } from '@/components/Meter';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

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
          <View style={styles.dimensionRow}>
            {reading.dimensions.map((d) => (
              <View
                key={d.dimension}
                style={styles.dimensionChip}
                testID={`dimension-${d.dimension}`}
              >
                <Text style={styles.dimensionName} numberOfLines={1}>
                  {d.name}
                </Text>
                {/* Bars, not the level word; the word stays as the
                    meter's accessibility label. No number reaches a Text
                    (ADR-0009). */}
                <LevelMeter level={d.level} label={d.label} />
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
            <View
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
            </View>
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

/** Title first, then the astrology, then the reading: show the calculation. */
function AspectCard({ card }: { card: SynastryAspectReading }) {
  return (
    <View style={styles.aspect}>
      <Text style={styles.aspectTitle}>{card.title}</Text>
      <Text style={styles.aspectGlyphs}>
        {aspectGlyphs(card.aspect)}
        <Text style={styles.aspectOrb}>
          {'  '}
          {formatDegree(card.aspect.orb)}
        </Text>
      </Text>
      <Text style={styles.aspectHead}>{card.headline}</Text>
      <Text style={styles.body}>{card.meaning}</Text>
    </View>
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
  // Five chips, one row, equal widths (owner, 2026-09-12: the longest
  // name was pushing Gelişim onto a second line). They share the width
  // rather than wrapping, so the padding is what gives way.
  dimensionRow: { flexDirection: 'row', gap: space.sm },
  dimensionChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    gap: space.xs,
  },
  dimensionName: { ...type.caption, color: color.textFaint },
  aspectLine: { gap: 2 },
  aspect: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.xs,
    marginBottom: space.sm,
  },
  aspectTitle: { ...type.heading, color: color.text },
  aspectGlyphs: { fontSize: 17, color: color.pink, letterSpacing: 2 },
  aspectOrb: { ...type.caption, color: color.textFaint, letterSpacing: 0 },
  aspectHead: { ...type.caption, color: color.textMuted },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
});
