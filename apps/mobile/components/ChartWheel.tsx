import {
  BODY_GLYPH,
  PLANETS,
  SIGN_GLYPH,
  SIGNS,
  natalAspects,
  type Body,
  type Planet,
  type PublicChart,
} from '@juno/astro';
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { color } from '@/theme/tokens';

/**
 * The chart wheel: houses, signs, planets and the aspects between them.
 *
 * Astrology draws the wheel anticlockwise from the Ascendant, which sits on
 * the left. So a longitude becomes a screen angle by measuring backwards
 * from the ascendant and rotating to put zero on the left — every position
 * on this wheel goes through `angleOf`, and nothing else does the maths.
 *
 * Aspects come from the engine (`natalAspects`), not from a second
 * calculation here: a wheel that disagreed with the list under it would be
 * worse than no wheel.
 */
export function ChartWheel({
  chart,
  size = 320,
}: {
  chart: PublicChart;
  size?: number;
}) {
  const centre = size / 2;
  const rim = centre - 2;
  const signRing = rim - 16;
  const houseRing = signRing - 24;
  const planetRing = houseRing - 22;
  const aspectRing = planetRing - 20;

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

  const aspects = useMemo(() => natalAspects(chart), [chart]);

  /**
   * Where each planet's glyph is drawn, which is not always where it is.
   * A conjunction puts two bodies within a degree of each other and their
   * glyphs land on top of one another; this pushes them apart just enough
   * to read. The tick line still runs to the true longitude, so nothing is
   * misplaced — only the label moves.
   */
  const glyphAngles = useMemo(() => {
    const MIN_GAP = 7;
    const ordered = [...PLANETS].sort(
      (a, b) => chart.planets[a].longitude - chart.planets[b].longitude,
    );
    const placed = new Map<Planet, number>();
    let previous: number | null = null;
    for (const planet of ordered) {
      const wanted = chart.planets[planet].longitude;
      const shifted: number =
        previous !== null && wanted - previous < MIN_GAP
          ? previous + MIN_GAP
          : wanted;
      placed.set(planet, shifted);
      previous = shifted;
    }
    // The circle wraps: if the last one has been pushed past the first,
    // give up on spreading rather than drawing a planet in the wrong sign.
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    if (
      first &&
      last &&
      (placed.get(last) ?? 0) - 360 > (placed.get(first) ?? 0) - MIN_GAP
    ) {
      for (const planet of PLANETS)
        placed.set(planet, chart.planets[planet].longitude);
    }
    return placed;
  }, [chart]);

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
                stroke={aspect.term >= 0 ? color.pink : color.tense}
                strokeWidth={1}
                opacity={0.55}
              />
            );
          })}
        </G>

        <G>
          {PLANETS.map((planet) => {
            const placement = chart.planets[planet];
            const spot = at(
              glyphAngles.get(planet) ?? placement.longitude,
              planetRing,
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
                  y={spot.y + 5}
                  fill={color.text}
                  fontSize={13}
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
