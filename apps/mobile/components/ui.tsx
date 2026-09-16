import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { useReducedMotion } from '@/lib/a11y';
import { CosmicGround } from '@/components/CosmicGround';
import {
  color,
  font,
  glass,
  gradient,
  radius,
  space,
  type,
} from '@/theme/tokens';

/**
 * The shared pieces every screen is built from. One file: the set is small
 * and a screen importing five things from five files reads worse than this.
 */

/**
 * The gutter every `Screen` keeps down each side. Exported so a child that
 * has to run edge to edge — a photo (owner, 2026-09-12: "fotoğrafların
 * sağında ve solunda boşluk görmek istemiyorum") — can cancel exactly it
 * rather than guessing at a number.
 */
export const SCREEN_PADDING = space.xl;

/** The clearance a `Screen` keeps above its first child, for the status bar. */
export const SCREEN_TOP_PADDING = 68;

/**
 * How much of the window a full-screen photo takes, on the deck and on the
 * profile. One number so the two line up (owner, 2026-09-14: "keşfette ve
 * profilde resimler aynı hizada olsun") — both start at the top edge, so
 * equal heights put their bottoms on the same line. The deck arrives at it
 * by filling what its fixed block below leaves and capping here; the
 * profile, which scrolls, takes it directly.
 *
 * The two popup sheets are not in this: they are 88% of the screen tall
 * and keep the picture's own 3:4.
 */
export const PHOTO_SCREEN_FRACTION = 0.56;

/**
 * What a host owes its first child if that child takes the top edge.
 *
 * The vertical twin of `SCREEN_PADDING`: the gutter is cancelled with a
 * negative margin by a child that runs edge to edge, and the top gap is
 * cancelled the same way — except that its size differs per host, so it
 * cannot be a constant. `Screen` keeps its 68 on the content container and
 * publishes it; a bleed `Popup` gives its own up at the sheet and so
 * publishes 0.
 */
const TopGapContext = createContext<number>(0);
export const TopGapContextProvider = TopGapContext.Provider;
export function useTopGap(): number {
  return useContext(TopGapContext);
}

export function Screen({
  children,
  bleed = false,
  testID,
}: {
  children: ReactNode;
  /**
   * The first child paints to the top edge. It cancels `SCREEN_TOP_PADDING`
   * itself through `useTopGap`; the padding stays on the content container
   * so every other branch of the screen — a spinner, an error — keeps its
   * clearance without asking. The top also stops rubber-banding, which is
   * the whole of "yukarı doğru scrollanmasın" (owner, 2026-09-14); iOS has
   * no per-edge control, so the bottom loses its bounce with it.
   */
  bleed?: boolean;
  testID?: string;
}) {
  return (
    <View style={s.screen}>
      {/* The sky under every screen (owner, 2026-09-16); the scroll view
          over it paints nothing of its own. */}
      <CosmicGround planet={false} horizon={false} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.screenContent}
        bounces={!bleed}
        overScrollMode={bleed ? 'never' : 'auto'}
        testID={testID}
      >
        <TopGapContext.Provider value={bleed ? SCREEN_TOP_PADDING : 0}>
          {children}
        </TopGapContext.Provider>
      </ScrollView>
    </View>
  );
}

/**
 * A surface the sky shows through: a translucent fill and a hairline —
 * the shape the owner pointed at ("hepsi uyum detayındaki sohbet
 * başlatıcı gibi olsun", 2026-09-16) after three rounds of blurred glass
 * that read as dimming, then as grey. No blur here; the sheet keeps one
 * of its own because it sits over a photo. The host sets the shape:
 * radius, border, padding.
 */
export function Glass({
  children,
  style,
  testID,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[s.glass, style]}>
      {children}
    </View>
  );
}

export function Display({ children }: { children: ReactNode }) {
  return <Text style={s.display}>{children}</Text>;
}

/** A pre-uppercased section kicker. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Body({
  children,
  muted = false,
  small = false,
  testID,
}: {
  children: ReactNode;
  muted?: boolean;
  small?: boolean;
  testID?: string;
}) {
  return (
    <Text
      testID={testID}
      style={[
        small ? s.bodySmall : s.body,
        muted ? { color: color.textMuted } : null,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Glass
      style={[s.card, style]}
      {...(testID === undefined ? {} : { testID })}
    >
      {children}
    </Glass>
  );
}

/**
 * The cap on how far a label may scale with the system text size.
 *
 * Everything else on a screen may grow without limit; a pill cannot. At
 * the largest accessibility size an uncapped label overflowed its own
 * gradient and the two buttons together took two thirds of the display.
 * 1.6 keeps them legible and still leaves the page usable.
 */
export const MAX_LABEL_SCALE = 1.6;

/** The one filled button in the product: warm peach into cool lavender. */
export function GradientButton({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.buttonWrap,
        (pressed || disabled) && s.buttonDim,
      ]}
    >
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.button}
      >
        <Text style={s.buttonText} maxFontSizeMultiplier={MAX_LABEL_SCALE}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * The unfilled button: a hairline border where GradientButton has its
 * fill, the same height, the same label cap. For a way in that is offered
 * beside the primary one rather than instead of it.
 */
export function OutlineButton({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.outlineButton,
        (pressed || disabled) && s.buttonDim,
      ]}
    >
      <Text style={s.outlineText} maxFontSizeMultiplier={MAX_LABEL_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LinkText({
  children,
  onPress,
  testID,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text testID={testID} onPress={onPress} style={[s.link, style]}>
      {children}
    </Text>
  );
}

/**
 * The back affordance for a screen reached from somewhere else.
 *
 * A `Link` back to where you came from pushes another screen, so bouncing
 * between a profile and its chart grows the stack without bound and the
 * screen you left is still behind you. This pops instead, and only falls
 * back to `fallback` when there is nothing to pop — a deep link, or a
 * fresh web tab opened straight onto this route.
 *
 * The label names `fallback` while the tap pops wherever you came from,
 * so the two can disagree. That is the platform's own bargain — an iOS
 * back button pops, whatever its title — and the alternative, always
 * replacing with `fallback`, is the stack growth this exists to stop.
 */
export function BackLink({
  label,
  fallback,
  testID,
}: {
  label: string;
  fallback: Href;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      // The text is one line of 15pt inside 8pt of padding; the slop is
      // what carries it over the 44pt minimum target.
      hitSlop={{ top: 10, bottom: 10, left: 16, right: 24 }}
      onPress={() => goBack(fallback)}
      style={({ pressed }) => [s.backHit, pressed && s.buttonDim]}
    >
      <Text style={s.back}>{label}</Text>
    </Pressable>
  );
}

/**
 * Leave a screen the way its back control does: pop if there is anything
 * to pop, and otherwise seat `fallback`'s stack beneath a cold open (deep
 * link, fresh web tab) — `withAnchor` gives the next back somewhere to go,
 * and is a no-op when the stack already exists.
 *
 * Exported because the chat has three ways out — the chevron, the pager's
 * right-swipe and its error branch's link — and they must not be able to
 * disagree about what "back" means.
 */
export function goBack(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback, { withAnchor: true });
}

/**
 * The same way back with no word beside it, for a header that already says
 * whose screen this is (owner, 2026-09-14: "geri butonunun sağında
 * eşleşmeler yazmasına gerek yok").
 *
 * `glyph` is drawn and `accessibilityLabel` is spoken, because "‹" is not
 * a sentence. The box is 44pt tall and about 20 wide, and the slop carries
 * the narrow axis over the minimum without widening the header row.
 */
export function BackChevron({
  glyph,
  accessibilityLabel,
  fallback,
  testID,
}: {
  glyph: string;
  accessibilityLabel: string;
  fallback: Href;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 0, bottom: 0, left: space.lg, right: space.md }}
      onPress={() => goBack(fallback)}
      style={({ pressed }) => [s.chevronHit, pressed && s.buttonDim]}
    >
      <Text style={s.chevron}>{glyph}</Text>
    </Pressable>
  );
}

/**
 * The brand mark, drawn: a gradient ring, tilted, and two spheres that
 * travel round it with their light (owner, 2026-09-16: the ring stays,
 * the planets orbit — not a spin of the whole). The ring is SVG. Each
 * sphere rides a stack of views: the outermost tilts and squashes a
 * circle into the ring's ellipse, the next turns 0 → 360° on one native
 * loop, the sphere sits at the ring's radius inside it and, in its own
 * views, turns back and un-squashes so it stays a lit sphere. Every
 * transform is a two-stop rotation or a constant, which is the one path
 * the native driver runs the same on every platform — a table of points
 * on the ellipse drew half a lap on iOS and snapped (measured from a
 * screen recording, 2026-09-16). 0° and 360° are one place, so a lap
 * closes without a seam. With Reduce Motion on, the spheres hold.
 * `assets/brand/orbit-mark.png` stays as the icon's source.
 */
export function OrbitMark({ size = 96 }: { size?: number }) {
  const still = useReducedMotion();
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) {
      turn.setValue(0);
      return;
    }
    const run = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: ORBIT_MS,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    run.start();
    return () => {
      run.stop();
    };
  }, [still, turn]);
  const a = size * ORBIT_A;
  const b = size * ORBIT_B;
  const sphere = size * 0.22;
  const { spin, unspin } = useMemo(
    () => ({
      spin: turn.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
      unspin: turn.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-360deg'],
      }),
    }),
    [turn],
  );
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      role="img"
      aria-label="Juno"
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="orbit-ring" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="0.5" stopColor={gradient[1]} />
            <Stop offset="1" stopColor={gradient[2]} />
          </SvgLinearGradient>
        </Defs>
        {/* A faint wide pass under the ring is its light. */}
        <Ellipse
          cx={size / 2}
          cy={size / 2}
          rx={a}
          ry={b}
          transform={`rotate(${ORBIT_TILT_DEG} ${size / 2} ${size / 2})`}
          stroke="url(#orbit-ring)"
          strokeWidth={Math.max(6, size * 0.09)}
          opacity={0.18}
          fill="none"
        />
        <Ellipse
          cx={size / 2}
          cy={size / 2}
          rx={a}
          ry={b}
          transform={`rotate(${ORBIT_TILT_DEG} ${size / 2} ${size / 2})`}
          stroke="url(#orbit-ring)"
          strokeWidth={Math.max(1.5, size * 0.028)}
          fill="none"
        />
      </Svg>
      {/* The ellipse's frame: tilted, and a circle of radius `a` squashed
          to `b` tall. Both spheres orbit inside it. */}
      <View
        style={[
          s.orbitFrame,
          {
            width: size,
            height: size,
            transform: [{ rotate: `${ORBIT_TILT_DEG}deg` }, { scaleY: b / a }],
          },
        ]}
        pointerEvents="none"
      >
        <Sphere
          spin={spin}
          unspin={unspin}
          radius={a}
          squash={a / b}
          size={sphere}
          tone="cool"
          offsetDeg={0}
        />
        <Sphere
          spin={spin}
          unspin={unspin}
          radius={a}
          squash={a / b}
          size={sphere}
          tone="warm"
          offsetDeg={180}
        />
      </View>
    </View>
  );
}

/** One lap of the spheres. Slow: this is a mark, not a loader. */
const ORBIT_MS = 11000;
/** The ring's tilt, matching the icon. */
const ORBIT_TILT_DEG = -16;
/**
 * The icon's ellipse: about seven tenths of the mark wide and, before the
 * tilt, two thirds as tall as it is wide (owner, 2026-09-16: "bu kadar
 * eliptik değildi").
 */
const ORBIT_A = 0.36;
const ORBIT_B = 0.24;

/**
 * One sphere on the ring. `spin` turns the arm that carries it; at the
 * arm's end the sphere turns back by the same angle and stretches back
 * by the frame's squash, so it is the same lit ball at every point of
 * the lap. `offsetDeg` puts the second sphere across from the first.
 */
function Sphere({
  spin,
  unspin,
  radius,
  squash,
  size,
  tone,
  offsetDeg,
}: {
  spin: Animated.AnimatedInterpolation<string>;
  unspin: Animated.AnimatedInterpolation<string>;
  radius: number;
  squash: number;
  size: number;
  tone: 'warm' | 'cool';
  offsetDeg: 0 | 180;
}) {
  const glow = size * 2.6;
  const [light, mid, dark] =
    tone === 'warm'
      ? [color.text, color.warm, color.pink]
      : [color.text, color.coolLight, color.cool];
  return (
    <Animated.View
      style={[
        s.orbitArm,
        { transform: [{ rotate: `${offsetDeg}deg` }, { rotate: spin }] },
      ]}
    >
      <View style={[s.orbitSeat, { left: '50%', marginLeft: radius }]}>
        <Animated.View
          style={{
            transform: [
              { rotate: unspin },
              { rotate: `${-offsetDeg}deg` },
              { scaleY: squash },
              { rotate: `${-ORBIT_TILT_DEG}deg` },
            ],
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
            }}
          >
            <Glow
              size={glow}
              style={{ top: -(glow - size) / 2, left: -(glow - size) / 2 }}
            />
            <Svg width={size} height={size}>
              <Defs>
                <RadialGradient id={`sphere-${tone}`} cx="35%" cy="30%" r="70%">
                  <Stop offset="0" stopColor={light} />
                  <Stop offset="0.35" stopColor={mid} />
                  <Stop offset="1" stopColor={dark} />
                </RadialGradient>
              </Defs>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={size / 2}
                fill={`url(#sphere-${tone})`}
              />
            </Svg>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** The name, set the way the door sets it: light, wide, unhurried. */
export function Wordmark({ size = 46 }: { size?: number }) {
  return (
    <Text
      style={[
        s.wordmark,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.22),
          letterSpacing: size * 0.15,
        },
      ]}
    >
      Juno
    </Text>
  );
}

/**
 * A choice: one of a few, or one of many. The gender and interest rows on
 * onboarding and the element row in the filters were three private copies
 * of this, each a little different (a border, no border; body, body
 * small); this is the one (ROADMAP D1). Selected is the cool end of the
 * gradient with near-black on it, the same pair the segments use.
 *
 * 44pt tall: `bodySmall` at lineHeight 20 inside 11 of padding and a 1pt
 * border — the touch minimum this codebase asks for, which the 40pt
 * element chips were under (NOTES 2026-09-16).
 */
export function Chip({
  label,
  selected,
  onPress,
  disabled = false,
  fit = false,
  style,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Shrink the label to one line rather than wrap it — for a fixed row. */
  fit?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        selected && s.chipOn,
        pressed && s.buttonDim,
        style,
      ]}
    >
      <Text
        style={[s.chipText, selected && s.chipTextOn]}
        {...(fit
          ? {
              numberOfLines: 1,
              adjustsFontSizeToFit: true,
              minimumFontScale: 0.75,
            }
          : {})}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A glyph in a circle: the head of every card that is about one body or
 * one aspect (sheet frames 07, 11, 12). Lifted out of the chart detail so
 * the match page's aspect cards draw the same one.
 */
export function GlyphBadge({
  glyph,
  size = 40,
  ink = color.pink,
  tint,
}: {
  glyph: string;
  size?: number;
  /** The glyph's colour; the sheet colours a sign's by its element. */
  ink?: string;
  /** A fill behind it; without one the circle is the raised surface. */
  tint?: string;
}) {
  return (
    <View
      style={[
        s.badge,
        { width: size, height: size },
        tint === undefined ? null : { backgroundColor: tint, borderWidth: 0 },
      ]}
    >
      <Text style={[s.badgeGlyph, { color: ink }]}>{glyph}</Text>
    </View>
  );
}

/**
 * The gradient ring the sheet draws around the thing that matters on a
 * page — the band on the match page (frames 09 and 10), where it stands
 * in for the number the product never prints. A gradient disc with the
 * ground painted back over its middle, a glow behind, and whatever is
 * passed in centred inside. Paint only.
 */
export function Halo({
  size,
  ring = 3,
  ground = color.bg,
  children,
}: {
  size: number;
  ring?: number;
  /** What the host paints under it — a sheet is `surface`, a page `bg`. */
  ground?: string;
  children: ReactNode;
}) {
  const glow = size * 1.9;
  return (
    <View style={[s.haloWrap, { width: size, height: size }]}>
      <Glow
        size={glow}
        style={{ top: -(glow - size) / 2, left: -(glow - size) / 2 }}
      />
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.haloRing, { width: size, height: size }]}
      >
        <View
          style={[
            s.haloInner,
            {
              width: size - ring * 2,
              height: size - ring * 2,
              backgroundColor: ground,
            },
          ]}
        >
          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * A soft light behind something — the mark on the door, later the ring on
 * the match page. A radial gradient in SVG rather than a blurred view: the
 * same code renders on the web, where a native blur has no equivalent, and
 * `react-native-svg` is already here for the wheel. Paint only; it takes
 * no touches and is positioned by whoever places it.
 */
export function Glow({
  size,
  style,
}: {
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const r = size / 2;
  return (
    <Svg
      width={size}
      height={size}
      style={[s.glow, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color.warm} stopOpacity={0.42} />
          <Stop offset="0.5" stopColor={color.cool} stopOpacity={0.16} />
          <Stop offset="1" stopColor={color.cool} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#glow)" />
    </Svg>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  screenContent: {
    padding: SCREEN_PADDING,
    paddingTop: SCREEN_TOP_PADDING,
    // The gutter, not more: the tab bar under this screen already sits
    // between the last card and the home indicator (owner, 2026-09-15:
    // too much space under "Tüm haritanı gör").
    paddingBottom: SCREEN_PADDING,
    gap: space.md,
  },
  display: { ...type.display, color: color.text },
  label: {
    ...type.label,
    color: color.textFaint,
    marginTop: space.xl,
    marginBottom: space.xs,
  },
  body: { ...type.body, color: color.text },
  bodySmall: { ...type.bodySmall, color: color.textMuted },
  buttonWrap: { borderRadius: radius.pill, overflow: 'hidden' },
  buttonDim: { opacity: 0.6 },
  button: {
    paddingVertical: 16,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  buttonText: { ...type.heading, color: color.onBright, textAlign: 'center' },
  // 15 + the 1pt border on each side: the same 16 the gradient one pads,
  // so the two stack at one height.
  outlineButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    paddingVertical: 15,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  outlineText: { ...type.heading, color: color.text, textAlign: 'center' },
  glass: { backgroundColor: glass.fill, overflow: 'hidden' },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.edge,
    padding: space.lg,
    gap: space.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: glass.fillSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: glass.edge,
    paddingVertical: 11,
    paddingHorizontal: space.lg,
  },
  chipOn: { backgroundColor: color.cool, borderColor: color.cool },
  chipText: {
    ...type.bodySmall,
    fontFamily: font.medium,
    color: color.text,
    textAlign: 'center',
  },
  chipTextOn: { color: color.onBright, fontFamily: font.semibold },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: glass.fillHigh,
    borderWidth: 1,
    borderColor: glass.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlyph: { fontSize: 19 },
  glow: { position: 'absolute' },
  orbitFrame: { position: 'absolute', top: 0, left: 0 },
  // The arm fills the frame and turns about its centre; the seat is a
  // point at the arm's end, on the ring.
  orbitArm: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  orbitSeat: { position: 'absolute', top: '50%', width: 0, height: 0 },
  wordmark: {
    fontFamily: font.light,
    color: color.text,
    textAlign: 'center',
  },
  haloWrap: { alignSelf: 'center' },
  haloRing: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloInner: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
  backHit: { alignSelf: 'flex-start', paddingVertical: space.sm },
  chevronHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: space.sm,
  },
  // Larger than the label it replaces: alone on the row it has to read as
  // a control rather than as punctuation.
  chevron: { fontSize: 30, lineHeight: 34, color: color.textMuted },
  back: { ...type.body, color: color.textMuted },
});
