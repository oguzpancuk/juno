import { LinearGradient } from 'expo-linear-gradient';
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
        <Text style={s.buttonText}>{label}</Text>
      </LinearGradient>
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
  button: { paddingVertical: 16, alignItems: 'center' },
  buttonText: { ...type.heading, color: color.onBright },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.sm,
  },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
});
