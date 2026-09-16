import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
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
import { color } from '@/theme/tokens';

/**
 * The night sky the sheet puts behind the calculating screen (frame 04)
 * and, at the owner's asking, behind every screen: soft clouds of the
 * palette's colours, a star falling across a corner now and then, and a
 * planet's limb over the top edge and a warm horizon at the bottom where
 * a host wants them. The field of stars that was here is gone (owner,
 * 2026-09-16: "yıldızları kaldıralım, sadece yıldız kayması kalsın").
 * Drawn, not photographed — the same code renders on the web. Paint
 * only: it sits under everything and takes no touches. With Reduce
 * Motion on, nothing moves.
 */
/** How long a falling star takes, and how long the sky waits between. */
const FALL_MS = 900;
const FALL_GAP_MS = { min: 7000, max: 16000 } as const;
// react-native-web has no native driver and warns once per app run.
const NATIVE = Platform.OS !== 'web';

/**
 * Soft clouds of the palette's own colours, placed in fractions of the
 * window so the composition holds on every size. Faint on their own; the
 * glass over them is where they show, scattered.
 */
const NEBULAE = [
  { x: 0.2, y: 0.28, r: 0.55, colour: color.cool, alpha: 0.28, period: 46000 },
  { x: 0.85, y: 0.55, r: 0.5, colour: color.pink, alpha: 0.2, period: 61000 },
  { x: 0.4, y: 0.85, r: 0.6, colour: color.warm, alpha: 0.16, period: 53000 },
] as const;
type NebulaSpec = (typeof NEBULAE)[number];

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
      {NEBULAE.map((n, i) => (
        <Nebula
          key={i}
          nebula={n}
          width={width}
          height={height}
          still={still}
        />
      ))}
      {still ? null : <FallingStar width={width} height={height} />}
    </View>
  );
}

/**
 * One cloud, drifting (owner, 2026-09-16: "biraz hareketli olsun"): a
 * radial gradient in its own view, carried round a small ellipse by one
 * native loop — a raised cosine on each axis, zero at both ends, so the
 * loop's reset is continuous — over the better part of a minute. Slow
 * enough to be felt rather than seen. Its own view rather than a circle
 * in the sky's SVG because the native driver moves views, not SVG props.
 */
function Nebula({
  nebula,
  width,
  height,
  still,
}: {
  nebula: NebulaSpec;
  width: number;
  height: number;
  still: boolean;
}) {
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) {
      drift.setValue(0);
      return;
    }
    const run = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: nebula.period,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      }),
    );
    run.start();
    return () => {
      run.stop();
    };
  }, [drift, nebula.period, still]);
  const size = width * nebula.r * 2;
  const reach = width * 0.06;
  // Two raised cosines a quarter-turn apart trace an ellipse.
  const translateX = drift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, reach, 0, -reach, 0],
  });
  const translateY = drift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-reach * 0.6, 0, reach * 0.6, 0, -reach * 0.6],
  });
  return (
    <Animated.View
      style={[
        styles.nebula,
        {
          left: width * nebula.x - size / 2,
          top: height * nebula.y - size / 2,
          width: size,
          height: size,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="nebula" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0"
              stopColor={nebula.colour}
              stopOpacity={nebula.alpha}
            />
            <Stop
              offset="0.55"
              stopColor={nebula.colour}
              stopOpacity={nebula.alpha * 0.35}
            />
            <Stop offset="1" stopColor={nebula.colour} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#nebula)" />
      </Svg>
    </Animated.View>
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
        // Load-bearing: a loop's reset reaches only the sequence's first
        // step, the delay, so without this the star would fall once and
        // park (review, 2026-09-16).
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
  // Down and to the left; the streak is turned to the same vector, so the
  // tail cannot point anywhere but where the star came from (owner,
  // 2026-09-16: "kuyrukla aynı yönde değil").
  const dx = -1;
  const dy = 0.6;
  const heading = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel * dx],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel * dy],
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
          transform: [{ translateX }, { translateY }, { rotate: heading }],
        },
      ]}
    >
      <LinearGradient
        // Tail to head: the view's +x points along the heading, so the
        // bright end is the one in front.
        colors={[color.bg, color.coolLight, color.text]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.streakFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
  nebula: { position: 'absolute' },
  streak: { position: 'absolute', width: 96, height: 2 },
  streakFill: { flex: 1, borderRadius: 1 },
});
