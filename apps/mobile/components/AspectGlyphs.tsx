import {
  ASPECT_GLYPH,
  BODY_GLYPH,
  aspectKind,
  type Aspect,
  type Body,
} from '@juno/astro';
import { StyleSheet, Text, View } from 'react-native';
import { aspectTone, planet, radius, space } from '@/theme/tokens';

/**
 * "♀ △ ♂" as the sheet colours it (owner, 2026-09-16): each planet in its
 * own colour, the aspect's symbol in its kind's, the pill behind them
 * tinted the same. The kind is the engine's (`aspectKind`, from the
 * term's sign), never read off the name here. One component for the
 * match page's cards and the chart's natal aspects.
 */
export function AspectGlyphs({
  aspect,
  size = 17,
}: {
  aspect: {
    readonly planetA: Body;
    readonly aspect: Aspect;
    readonly planetB: Body;
    readonly term: number;
  };
  size?: number;
}) {
  const tone = aspectTone[aspectKind(aspect)];
  const glyph = { fontSize: size, lineHeight: size + 6 };
  return (
    <View style={[styles.pill, { backgroundColor: tone.tint }]}>
      <Text style={[glyph, { color: planet[aspect.planetA] }]}>
        {BODY_GLYPH[aspect.planetA]}
      </Text>
      <Text style={[glyph, { color: tone.ink }]}>
        {ASPECT_GLYPH[aspect.aspect]}
      </Text>
      <Text style={[glyph, { color: planet[aspect.planetB] }]}>
        {BODY_GLYPH[aspect.planetB]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.sm,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: space.md,
  },
});
