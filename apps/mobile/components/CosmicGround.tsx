import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { useReducedMotion } from '@/lib/a11y';
import { starField, type Star } from '@/lib/stars';
import { color, star as starColor } from '@/theme/tokens';

/**
 * The night sky the sheet puts behind the calculating screen (frame 04)
 * and, at the owner's asking, behind every screen: a field of stars that
 * breathe in their own time, in four colours, with one falling now and
 * then; a planet's limb over the top edge and a warm horizon at the
 * bottom where a host wants them. Drawn, not photographed — the same
 * code renders on the web. Paint only: it sits under everything and
 * takes no touches.
 *
 * The stars are views, not SVG circles: the native driver animates a
 * view's opacity off the JavaScript thread, and fifty of them cost
 * nothing that way, where fifty animated SVG props would run on the JS
 * thread every frame. With Reduce Motion on, nothing moves.
 */
export const STAR_COUNT = 52;
/** Any number; changing it moves every star, so pick once. */
const SEED = 1995;
/** How long a falling star takes, and how long the sky waits between. */
const FALL_MS = 900;
const FALL_GAP_MS = { min: 7000, max: 16000 } as const;
// react-native-web has no native driver and warns once per app run.
const NATIVE = Platform.OS !== 'web';

export function CosmicGround({
  planet = true,
  horizon = true,
  horizonRise = 0.16,
}: {
  /** The limb over the top edge; off where the top belongs to a mark. */
  planet?: boolean;
  /** The curve at the bottom; off where a sheet or a bar sits there. */
  horizon?: boolean;
  /** How far the curve's top sits above the bottom edge, in widths. */
  horizonRise?: number;
}) {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const stars = useMemo(
    () => starField(SEED, STAR_COUNT, width, height),
    [width, height],
  );

  const planetR = width * 0.62;
  const planetCx = width * 0.5;
  const planetCy = -width * 0.24;
  const horizonR = width * 1.1;
  const horizonCy = height + horizonR - width * horizonRise;

  return (
    <View
      style={[styles.ground, { width, height }]}
      pointerEvents="none"
      aria-hidden
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="ground-planet" cx="62%" cy="78%" r="70%">
            <Stop offset="0" stopColor={color.surfaceHigh} />
            <Stop offset="1" stopColor={color.bg} />
          </RadialGradient>
          <SvgGradient id="ground-rim" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={color.warm} />
            <Stop offset="0.5" stopColor={color.pink} />
            <Stop offset="1" stopColor={color.cool} />
          </SvgGradient>
          <SvgGradient id="ground-horizon" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color.cool} />
            <Stop offset="0.5" stopColor={color.pink} />
            <Stop offset="1" stopColor={color.warm} />
          </SvgGradient>
        </Defs>
        {planet ? (
          <>
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
          </>
        ) : null}
        {horizon ? (
          <>
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
          </>
        ) : null}
      </Svg>
      {stars.map((s, i) => (
        <Twinkle key={i} star={s} still={still} />
      ))}
      {still ? null : <FallingStar width={width} height={height} />}
    </View>
  );
}

/** One star, breathing between a third of its light and all of it. */
function Twinkle({ star, still }: { star: Star; still: boolean }) {
  const [light] = useState(() => new Animated.Value(star.alpha));
  useEffect(() => {
    if (still) {
      light.setValue(star.alpha);
      return;
    }
    const low = star.alpha * 0.35;
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(light, {
          toValue: low,
          duration: star.period / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(light, {
          toValue: star.alpha,
          duration: star.period / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    // Start partway through the breath, so the field never pulses as one.
    const lead = Animated.timing(light, {
      toValue: low + (star.alpha - low) * star.phase,
      duration: star.period * star.phase,
      easing: Easing.linear,
      useNativeDriver: NATIVE,
    });
    const run = Animated.sequence([lead, breath]);
    run.start();
    return () => {
      run.stop();
    };
  }, [light, star, still]);
  const size = star.r * 2;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: star.x - star.r,
        top: star.y - star.r,
        width: size,
        height: size,
        borderRadius: star.r,
        backgroundColor: starColor[star.hue] ?? starColor[0],
        opacity: light,
      }}
    />
  );
}

/**
 * A streak that crosses a corner of the sky every so often. One value
 * drives it from off the top right to off the bottom left; a random wait
 * — fixed for the life of the screen — sits between falls.
 */
function FallingStar({ width, height }: { width: number; height: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [gap] = useState(
    () => FALL_GAP_MS.min + Math.random() * (FALL_GAP_MS.max - FALL_GAP_MS.min),
  );
  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.delay(gap),
        Animated.timing(progress, {
          toValue: 1,
          duration: FALL_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    fall.start();
    return () => {
      fall.stop();
    };
  }, [gap, progress]);
  const travel = Math.max(width, height) * 0.7;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -travel],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel * 0.6],
  });
  // In only while it moves; parked invisible between falls.
  const opacity = progress.interpolate({
    inputRange: [0, 0.05, 0.8, 1],
    outputRange: [0, 0.9, 0.6, 0],
  });
  return (
    <Animated.View
      style={[
        styles.streak,
        {
          left: width * 0.85,
          top: height * 0.08,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: '31deg' }],
        },
      ]}
    >
      <LinearGradient
        colors={[color.text, color.coolLight, color.bg]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.streakFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', top: 0, left: 0 },
  streak: { position: 'absolute', width: 96, height: 2 },
  streakFill: { flex: 1, borderRadius: 1 },
});
