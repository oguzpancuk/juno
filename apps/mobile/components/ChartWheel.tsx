import {
  BODY_GLYPH,
  type Body,
  type InterAspect,
  PLANETS,
  type PublicChart,
  SIGNS,
  SIGN_GLYPH,
  aspectKind,
} from '@juno/astro';
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { MAX_GLYPH_LEVEL, glyphGapDegrees, glyphLevels } from '@/lib/wheel';
import { aspectTone, color } from '@/theme/tokens';

/**
 * The chart wheel: houses, signs, planets and the aspects between them.
 *
 * Astrology draws the wheel anticlockwise from the Ascendant, which sits on
 * the left. So a longitude becomes a screen angle by measuring backwards
 * from the ascendant and rotating to put zero on the left — every position
 * on this wheel goes through `angleOf`, and nothing else does the maths.
 *
 * Aspects are passed in rather than computed here, and the prop is
 * required: the screen shows the same aspects as a list under the wheel,
 * and a wheel that drew a line with no card beneath it would be worse
 * than no wheel. A default would leave that trap set for the next caller.
 */
export function ChartWheel({
  chart,
  aspects,
  size = 320,
}: {
  chart: PublicChart;
  aspects: readonly InterAspect[];
  size?: number;
}) {
  // Proportional, so the wheel is the same drawing at any size. The
  // planet band is the widest because the glyphs stack in it.
  const centre = size / 2;
  const rim = centre - 2;
  const signRing = rim - size * 0.05;
  const houseRing = signRing - size * 0.075;
  const planetRing = houseRing - size * 0.056;
  const aspectRing = planetRing - size * 0.106;
  /** One step in, with the innermost ring still clear of the aspect ring. */
  const levelStep = (planetRing - aspectRing) / (MAX_GLYPH_LEVEL + 1);
  const glyphSize = Math.max(9, size * 0.041);

  const ascendant = chart.houses.ascendant;
  const angleOf = (longitude: number): number =>
    ((ascendant - longitude) * Math.PI) / 180 + Math.PI;
  const at = (longitude: number, r: number) => {
    const a = angleOf(longitude);
    return { x: centre + Math.cos(a) * r, y: centre + Math.sin(a) * r };
  };

  // natalAspects can involve the Ascendant, which is not a planet and
  // lives on `houses`, so every lookup goes through here.
  const longitudeOf = (body: Body): number =>
    body === 'ascendant'
      ? chart.houses.ascendant
      : chart.planets[body].longitude;

  // Conjunct planets would draw their glyphs on the same pixel; each one
  // keeps its angle and steps inwards instead (see lib/wheel). The gap
  // is measured at the innermost ring, where the same angle is the least
  // distance, so no ring overlaps.
  const minGap = glyphGapDegrees(
    glyphSize * 1.15,
    planetRing - MAX_GLYPH_LEVEL * levelStep,
  );
  const levels = useMemo(() => glyphLevels(chart, minGap), [chart, minGap]);

  return (
    <View>
      <Svg width={size} height={size}>
        <Circle
          cx={centre}
          cy={centre}
          r={rim}
          stroke={color.border}
          strokeWidth={1}
          fill="none"
        />
        <Circle
          cx={centre}
          cy={centre}
          r={signRing}
          stroke={color.border}
          strokeWidth={1}
          fill="none"
        />
        <Circle
          cx={centre}
          cy={centre}
          r={houseRing}
          stroke={color.border}
          strokeWidth={1}
          fill="none"
        />
        <Circle
          cx={centre}
          cy={centre}
          r={aspectRing}
          stroke={color.border}
          strokeWidth={1}
          fill="none"
        />

        {/* Sign boundaries every 30°, with the glyph in the middle of each. */}
        <G>
          {SIGNS.map((sign, index) => {
            const start = index * 30;
            const edge = at(start, rim);
            const inner = at(start, signRing);
            const label = at(start + 15, (rim + signRing) / 2);
            return (
              <G key={sign}>
                <Line
                  x1={inner.x}
                  y1={inner.y}
                  x2={edge.x}
                  y2={edge.y}
                  stroke={color.border}
                  strokeWidth={1}
                />
                <SvgText
                  x={label.x}
                  y={label.y + 4}
                  fill={color.textMuted}
                  fontSize={11}
                  textAnchor="middle"
                >
                  {SIGN_GLYPH[sign]}
                </SvgText>
              </G>
            );
          })}
        </G>

        {/* House cusps. The angular four are drawn heavier: they are the
            axes a reader orients by. */}
        <G>
          {chart.houses.cusps.map((cusp, index) => {
            const angular = index % 3 === 0;
            const outer = at(cusp, signRing);
            const inner = at(cusp, aspectRing);
            const label = at(cusp + 6, (houseRing + planetRing) / 2);
            return (
              <G key={`cusp-${String(index)}`}>
                <Line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={angular ? color.textFaint : color.border}
                  strokeWidth={angular ? 1.4 : 1}
                />
                <SvgText
                  x={label.x}
                  y={label.y + 3}
                  fill={color.textFaint}
                  fontSize={9}
                  textAnchor="middle"
                >
                  {index + 1}
                </SvgText>
              </G>
            );
          })}
        </G>

        {/* Aspects, drawn first so the planets sit on top of them. */}
        <G>
          {aspects.map((aspect) => {
            const a = at(longitudeOf(aspect.planetA), aspectRing);
            const b = at(longitudeOf(aspect.planetB), aspectRing);
            return (
              <Line
                key={`${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={aspectTone[aspectKind(aspect)].ink}
                strokeWidth={1}
                opacity={0.55}
              />
            );
          })}
        </G>

        <G>
          {PLANETS.map((planet) => {
            const placement = chart.planets[planet];
            const level = levels.get(planet) ?? 0;
            const spot = at(
              placement.longitude,
              planetRing - level * levelStep,
            );
            const tick = at(placement.longitude, aspectRing);
            return (
              <G key={planet}>
                <Line
                  x1={spot.x}
                  y1={spot.y}
                  x2={tick.x}
                  y2={tick.y}
                  stroke={color.border}
                  strokeWidth={1}
                />
                <SvgText
                  x={spot.x}
                  y={spot.y + glyphSize * 0.38}
                  fill={color.text}
                  fontSize={glyphSize}
                  textAnchor="middle"
                >
                  {BODY_GLYPH[planet]}
                </SvgText>
              </G>
            );
          })}
        </G>

        {/* The Ascendant, on the left where the tradition puts it. */}
        <SvgText
          x={centre - rim + 8}
          y={centre + 4}
          fill={color.pink}
          fontSize={12}
          textAnchor="middle"
        >
          {BODY_GLYPH.ascendant}
        </SvgText>
      </Svg>
    </View>
  );
}
