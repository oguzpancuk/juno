import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { starField } from '@/lib/stars';
import { color } from '@/theme/tokens';

/**
 * The night sky the sheet puts behind the calculating screen (frame 04):
 * a planet's limb over the top edge, a field of stars, a warm horizon at
 * the bottom. Drawn, not photographed — the same code renders on the
 * web, and a licensed nebula is a decision the owner has not taken
 * (ROADMAP D series). Paint only: it sits under everything and takes no
 * touches.
 *
 * Sizes are fractions of the window width so the composition holds from
 * a small phone to a browser column; the star count is fixed, so a taller
 * window is a sparser sky, which is fine.
 */
export const STAR_COUNT = 48;
/** Any number; changing it moves every star, so pick once. */
const SEED = 1995;

export function CosmicGround() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(
    () => starField(SEED, STAR_COUNT, width, height),
    [width, height],
  );

  // The planet: most of it above the window, its lower limb an arc across
  // the top. The rim is the same circle stroked twice — a wide faint
  // halo and a hairline — so it reads as lit from behind.
  const planetR = width * 0.62;
  const planetCx = width * 0.5;
  const planetCy = -width * 0.24;
  // The horizon: a curve that just enters the bottom of the window.
  const horizonR = width * 1.1;
  const horizonCy = height + horizonR - width * 0.16;

  return (
    <Svg
      width={width}
      height={height}
      style={styles.ground}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <RadialGradient id="ground-planet" cx="62%" cy="78%" r="70%">
          <Stop offset="0" stopColor={color.surfaceHigh} />
          <Stop offset="1" stopColor={color.bg} />
        </RadialGradient>
        <LinearGradient id="ground-rim" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={color.warm} />
          <Stop offset="0.5" stopColor={color.pink} />
          <Stop offset="1" stopColor={color.cool} />
        </LinearGradient>
        <LinearGradient id="ground-horizon" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color.cool} />
          <Stop offset="0.5" stopColor={color.pink} />
          <Stop offset="1" stopColor={color.warm} />
        </LinearGradient>
      </Defs>

      {stars.map((s, i) => (
        <Circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill={color.text}
          opacity={s.alpha}
        />
      ))}

      <Circle
        cx={planetCx}
        cy={planetCy}
        r={planetR}
        stroke="url(#ground-rim)"
        strokeWidth={28}
        opacity={0.14}
        fill="none"
      />
      <Circle
        cx={planetCx}
        cy={planetCy}
        r={planetR}
        fill="url(#ground-planet)"
      />
      <Circle
        cx={planetCx}
        cy={planetCy}
        r={planetR}
        stroke="url(#ground-rim)"
        strokeWidth={1.5}
        opacity={0.85}
        fill="none"
      />

      <Circle
        cx={width * 0.5}
        cy={horizonCy}
        r={horizonR}
        stroke="url(#ground-horizon)"
        strokeWidth={24}
        opacity={0.12}
        fill="none"
      />
      <Circle
        cx={width * 0.5}
        cy={horizonCy}
        r={horizonR}
        stroke="url(#ground-horizon)"
        strokeWidth={1}
        opacity={0.6}
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', top: 0, left: 0 },
});
