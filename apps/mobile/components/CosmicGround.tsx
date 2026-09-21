import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSvgId } from '@/lib/svg-id';
import { color } from '@/theme/tokens';

/**
 * The night sky the sheet puts behind the calculating screen (frame 04)
 * and, at the owner's asking, behind every screen: soft clouds of the
 * palette's colours, a star falling from somewhere new now and then, and a
 * planet's limb over the top edge and a warm horizon at the bottom where
 * a host wants them. The field of stars that was here is gone (owner,
 * 2026-09-16: "yıldızları kaldıralım, sadece yıldız kayması kalsın").
 * Drawn, not photographed — the same code renders on the web. Paint
 * only: it sits under everything and takes no touches. With Reduce
 * Motion on, nothing moves.
 */
/**
 * How long a falling star takes, how long the sky waits between, and how
 * soon the first one comes: a screen a person has just arrived on shows
 * one within a few seconds (owner, 2026-09-16: the door had none to
 * see), then settles into the longer rhythm.
 */
const FALL_MS = 900;
const FALL_GAP_MS = { min: 7000, max: 16000 } as const;
const FIRST_FALL_MS = { min: 1200, max: 3200 } as const;
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

/**
 * How far the sky runs on past the bottom of its host, on the web.
 *
 * A mobile browser does not give a page its whole screen. Measured on the
 * owner's phone (2026-09-21, `public/diag.html`): an 874-point screen, a
 * 665-point page, and below the page a strip the browser keeps for its
 * floating toolbar. What shows in that strip is whatever the document
 * paints past its own bottom edge, and failing that a flat colour — so a
 * sky that ends exactly where the page ends is cut off with a ruled line,
 * and everything under it is black (owner, 2026-09-18: "arkaplan altta
 * kesiliyor, aşağısı simsiyah").
 *
 * So the layer overhangs. The geometry does not: the horizon and the
 * clouds are still placed against the window, because that is what they
 * were designed against and `welcome.tsx` tunes the curve to keep it off a
 * control. Only the canvas is longer, and the part of each cloud that used
 * to be clipped at the edge is what fills it.
 *
 * Inside the tabs the overhang runs under the tab bar first, which is
 * translucent, so the bar lets the sky through without leaving the layout
 * (owner, 2026-09-18: "alt tabin de biraz saydam olmasını istiyorum").
 *
 * 240 covers the bar (53) and the tallest strip measured (147 on the
 * owner's phone, 98 in the iOS 26 simulator) with room to spare. It does
 * make the document that much taller than its window: no wheel or touch
 * can scroll it, but a script could (`window.scrollTo`), and nothing in
 * the app does. `public/index.html` is the other half of this: `overflow:
 * hidden` there cuts the overhang off at the page's edge, `clip` on
 * `html` alone does not.
 *
 * Web only. On a phone the app owns the screen to its last point and
 * there is no strip to fill; whether the overhang would show through the
 * native tab bar has not been tried on a device, so it is not claimed.
 */
const OVERHANG = Platform.OS === 'web' ? 240 : 0;

export function CosmicGround({
  planet = true,
  horizon = true,
  horizonRise = 0.16,
  star = true,
}: {
  /** The limb over the top edge; off where the top belongs to a mark. */
  planet?: boolean;
  /** The curve at the bottom; off where a sheet or a bar sits there. */
  horizon?: boolean;
  /** How far the curve's top sits above the bottom edge, in widths. */
  horizonRise?: number;
  /**
   * The falling star; off where only a sliver of this sky is ever seen —
   * behind the tab bar — and a streak would be a line crossing the bar.
   */
  star?: boolean;
}) {
  const windowBox = useWindowDimensions();
  const still = useReducedMotion();
  /**
   * How big to draw the sky: the larger of the window and this view.
   *
   * The window alone is a snapshot of `innerHeight`, and on a mobile
   * browser that retracts its toolbar the visible area grows while this
   * layer — absolutely positioned, exactly that many pixels tall — does
   * not, leaving a band at the bottom with no sky in it. (This was first
   * taken for the band the owner reported on 2026-09-18. It was not: that
   * one is outside the page altogether — see OVERHANG.)
   *
   * The view alone is wrong in the other direction, and worse. Inside the
   * tabs the host is inset above the bar, so the horizon — placed at
   * `height` — climbed by the bar's height and, on the match-arrival
   * screen, ran straight through the "Şimdi değil" button. Seen in the
   * screenshot taken to prove the change was safe (review, 2026-09-18);
   * `welcome.tsx` tunes `horizonRise` precisely to keep that curve off a
   * control, and this had undone it everywhere at once.
   *
   * So: the geometry stays window-sized, which is what it was designed
   * against, and the canvas grows only when the host turns out to be
   * bigger than the window thought. `overflow: hidden` on an inset-zero
   * view clips the rest, exactly as before.
   */
  const [laidOut, setLaidOut] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const width = Math.max(windowBox.width, laidOut?.width ?? 0);
  // The host's height, not this layer's: `laidOut` measures the layer,
  // which overhangs its host by OVERHANG. Left in, every horizon would
  // climb by that much — the same mistake as measuring the view alone.
  const height = Math.max(windowBox.height, (laidOut?.height ?? 0) - OVERHANG);
  // One ground is behind every screen, and the router keeps more than one
  // screen mounted, so these three names are the ones most certain to
  // collide. See lib/svg-id.ts.
  const planetFill = useSvgId('ground-planet');
  const rim = useSvgId('ground-rim');
  const horizonLine = useSvgId('ground-horizon');

  const planetR = width * 0.62;
  const planetCx = width * 0.5;
  const planetCy = -width * 0.24;
  const horizonR = width * 1.1;
  const horizonCy = height + horizonR - width * horizonRise;

  return (
    <View
      style={styles.ground}
      pointerEvents="none"
      aria-hidden
      onLayout={({ nativeEvent }) => {
        const { width: w, height: h } = nativeEvent.layout;
        setLaidOut((was) =>
          was !== null && was.width === w && was.height === h
            ? was
            : { width: w, height: h },
        );
      }}
    >
      <Svg width={width} height={height + OVERHANG}>
        <Defs>
          <RadialGradient id={planetFill.id} cx="62%" cy="78%" r="70%">
            <Stop offset="0" stopColor={color.surfaceHigh} />
            <Stop offset="1" stopColor={color.bg} />
          </RadialGradient>
          <SvgGradient id={rim.id} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={color.warm} />
            <Stop offset="0.5" stopColor={color.pink} />
            <Stop offset="1" stopColor={color.cool} />
          </SvgGradient>
          <SvgGradient id={horizonLine.id} x1="0" y1="0" x2="1" y2="0">
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
              stroke={rim.url}
              strokeWidth={28}
              opacity={0.14}
              fill="none"
            />
            <Circle
              cx={planetCx}
              cy={planetCy}
              r={planetR}
              fill={planetFill.url}
            />
            <Circle
              cx={planetCx}
              cy={planetCy}
              r={planetR}
              stroke={rim.url}
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
              stroke={horizonLine.url}
              strokeWidth={24}
              opacity={0.12}
              fill="none"
            />
            <Circle
              cx={width * 0.5}
              cy={horizonCy}
              r={horizonR}
              stroke={horizonLine.url}
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
          index={i}
          nebula={n}
          width={width}
          height={height}
          still={still}
        />
      ))}
      {still || !star ? null : <FallingStar width={width} height={height} />}
    </View>
  );
}

/**
 * One cloud, drifting (owner, 2026-09-16: "biraz hareketli olsun"): a
 * radial gradient in its own view, carried round a small diamond of a
 * path by one native loop over the better part of a minute — slow enough
 * to be felt rather than seen. Its own view rather than a circle in the
 * sky's SVG because the native driver moves views, not SVG props.
 */
function Nebula({
  index,
  nebula,
  width,
  height,
  still,
}: {
  /** Into the gradient's id: on the web every sky shares one document. */
  index: number;
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
  // The cloud rides an arm that turns once per lap, offset from the arm's
  // centre by `reach`, so it circles a point of radius `reach` — the
  // two-stop rotation the mark's spheres use, measured there to run full
  // laps. A radial gradient does not show its own rotation.
  const spin = useMemo(
    () =>
      drift.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [drift],
  );
  const paint = useSvgId(`nebula-${index}`);
  return (
    <Animated.View
      style={[
        styles.nebula,
        {
          left: width * nebula.x - size / 2,
          top: height * nebula.y - size / 2,
          width: size,
          height: size,
          transform: [{ rotate: spin }, { translateX: reach }],
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={paint.id} cx="50%" cy="50%" r="50%">
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
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={paint.url} />
      </Svg>
    </Animated.View>
  );
}

/**
 * A streak that crosses the sky every so often, each time from somewhere
 * else and at its own angle (owner, 2026-09-16: "rastgele olmalı"). One
 * fall is one native timing; between falls a JS timer waits a random
 * while, then draws the next start and heading — so JavaScript runs once
 * per fall, never per frame. A star falls downward, left or right, from
 * the upper half of the sky.
 */
function FallingStar({ width, height }: { width: number; height: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  // Nothing until the first timer: the sky arrives still, and the first
  // star comes a moment later rather than mid-fall on the first frame.
  const [pass, setPass] = useState<Pass | null>(null);
  // Read at the moment the next fall is drawn, not held by the effect:
  // with the dimensions among its deps a resize replayed the current
  // fall from its start (review, 2026-09-16).
  const window = useRef({ width, height });
  useEffect(() => {
    window.current = { width, height };
  }, [width, height]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fall: Animated.CompositeAnimation | null = null;
    let live = true;
    const wait = (gap: { readonly min: number; readonly max: number }) => {
      timer = setTimeout(
        () => {
          if (!live) return;
          setPass(nextPass(window.current.width, window.current.height));
        },
        gap.min + Math.random() * (gap.max - gap.min),
      );
    };
    if (pass === null) {
      wait(FIRST_FALL_MS);
      return () => {
        live = false;
        if (timer !== null) clearTimeout(timer);
      };
    }
    progress.setValue(0);
    fall = Animated.timing(progress, {
      toValue: 1,
      duration: FALL_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE,
    });
    fall.start(({ finished }) => {
      if (finished && live) wait(FALL_GAP_MS);
    });
    return () => {
      live = false;
      fall?.stop();
      if (timer !== null) clearTimeout(timer);
    };
  }, [pass, progress]);
  // Memoised per pass: a fresh interpolation per render is a fresh
  // native node. In only while it moves; parked invisible between falls.
  const { translateX, translateY, opacity } = useMemo(
    () => ({
      translateX: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, (pass?.travel ?? 0) * (pass?.dx ?? 0)],
      }),
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, (pass?.travel ?? 0) * (pass?.dy ?? 0)],
      }),
      opacity: progress.interpolate({
        inputRange: [0, 0.05, 0.8, 1],
        outputRange: [0, 0.9, 0.6, 0],
      }),
    }),
    [pass, progress],
  );
  if (pass === null) return null;
  return (
    <Animated.View
      style={[
        styles.streak,
        {
          left: pass.x,
          top: pass.y,
          width: pass.length,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: pass.heading }],
        },
      ]}
    >
      <LinearGradient
        colors={[color.bg, color.coolLight, color.text]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.streakFill}
      />
    </Animated.View>
  );
}

interface Pass {
  x: number;
  y: number;
  dx: number;
  dy: number;
  travel: number;
  length: number;
  heading: string;
}

/**
 * Where the next star starts and where it goes. Anywhere across the
 * upper half; down at 25–65° below the horizontal, to the left or the
 * right; the streak turned to that same vector so the tail cannot point
 * anywhere but where it came from. The view's +x points along the
 * heading, so the bright end of the gradient leads.
 */
function nextPass(width: number, height: number): Pass {
  const angle = (25 + Math.random() * 40) * (Math.PI / 180);
  const toLeft = Math.random() < 0.5;
  const dx = Math.cos(angle) * (toLeft ? -1 : 1);
  const dy = Math.sin(angle);
  return {
    x: width * (0.1 + Math.random() * 0.8),
    y: height * (0.05 + Math.random() * 0.4),
    dx,
    dy,
    travel: Math.max(width, height) * (0.45 + Math.random() * 0.35),
    length: 72 + Math.random() * 48,
    heading: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`,
  };
}

const styles = StyleSheet.create({
  // Stretched to its host, so it can never be smaller than what it sits
  // behind; what is drawn inside it is sized separately. See `laidOut`.
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -OVERHANG,
    overflow: 'hidden',
  },
  nebula: { position: 'absolute' },
  streak: { position: 'absolute', height: 2 },
  streakFill: { flex: 1, borderRadius: 1 },
});
