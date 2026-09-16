import {
  houseOverlays,
  matchSections,
  synastryReading,
  type PublicChart,
} from '@juno/astro';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BandRing } from '@/components/BandRing';
import { CompatibilityDetail } from '@/components/CompatibilityDetail';
import { t } from '@/lib/strings';
import { color, space, type } from '@/theme/tokens';

/**
 * The whole reading of a pair: the band word, then everything
 * `CompatibilityDetail` lays out with the match page's two aspect sections
 * and its house overlays.
 *
 * One component for the match page's Uyum tab and the deck's "Uyum detayı"
 * sheet, so the two cannot drift apart (owner, 2026-09-15: the deck's
 * detail "aynısı olsun, sadece eşleştiniz kısmı olmasın"). What is
 * specific to a match — the "EŞLEŞTİNİZ" heading, the starter, the photos,
 * the safety controls — stays with the match page.
 *
 * Nothing here computes astrology beyond calling the engine: `mine` is
 * chart A, so headlines read from the viewer's side.
 */
export function PairReading({
  mine,
  theirs,
}: {
  mine: PublicChart;
  theirs: PublicChart;
}) {
  const reading = useMemo(
    () => synastryReading(mine, theirs, 5),
    [mine, theirs],
  );
  const sections = useMemo(
    () =>
      matchSections(
        reading.match,
        reading.dimensions.map((d) => d.label),
      ),
    [reading],
  );
  const overlays = useMemo(() => houseOverlays(mine, theirs), [mine, theirs]);
  return (
    <View style={styles.root} testID="synastry">
      {/* The band, never the number (ADR-0009 §3) — inside the ring the
          sheet draws around its percentage (frame 10), the same ring the
          deck shows small. */}
      <View style={styles.ring}>
        <BandRing
          band={reading.band}
          label={`${reading.bandName} ${t.discover.scoreLabel}`}
          size={168}
          stroke={6}
          glow
        >
          <Text style={styles.bandName} testID="band">
            {reading.bandName}
          </Text>
          <Text style={styles.bandLabel}>{t.discover.scoreLabel}</Text>
        </BandRing>
      </View>
      <CompatibilityDetail
        reading={reading}
        sections={sections}
        overlays={overlays}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm, paddingTop: space.md },
  ring: { alignSelf: 'center' },
  bandName: { ...type.title, color: color.text, textAlign: 'center' },
  bandLabel: { ...type.label, color: color.textFaint },
});
