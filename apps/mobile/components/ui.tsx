import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { color, gradient, radius, space, type } from '@/theme/tokens';

/**
 * The shared pieces every screen is built from. One file: the set is small
 * and a screen importing five things from five files reads worse than this.
 */

export function Screen({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.screenContent}
      testID={testID}
    >
      {children}
    </ScrollView>
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
    <View testID={testID} style={[s.card, style]}>
      {children}
    </View>
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
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.outlineButton, pressed && s.buttonDim]}
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
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback);
      }}
      style={({ pressed }) => [s.backHit, pressed && s.buttonDim]}
    >
      <Text style={s.back}>{label}</Text>
    </Pressable>
  );
}

/**
 * The brand mark: the orbit, two spheres on a gradient ring.
 *
 * Source of truth is the owner's icon of 2026-09-11, keyed to transparency
 * as `assets/brand/orbit-mark.png`. NOT `assets/brand/mark.svg`, which is
 * the previous gold-glyph mark and no longer the logo — it and
 * `scripts/brand-assets.py` are stale until the new mark exists as a
 * vector. Drawing this in views is what the first attempt did and it
 * showed.
 */
export function OrbitMark({ size = 96 }: { size?: number }) {
  return (
    <Image
      source={require('../assets/brand/orbit-mark.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Juno"
    />
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  screenContent: {
    padding: space.xl,
    paddingTop: 68,
    paddingBottom: 56,
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
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.sm,
  },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
  backHit: { alignSelf: 'flex-start', paddingVertical: space.sm },
  back: { ...type.body, color: color.textMuted },
});
