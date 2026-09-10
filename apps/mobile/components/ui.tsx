import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
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
  scroll = true,
}: {
  children: ReactNode;
  testID?: string;
  scroll?: boolean;
}) {
  if (!scroll)
    return (
      <View style={s.screen} testID={testID}>
        {children}
      </View>
    );
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

export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
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
  tone = 'plain',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** `lifted` is a card that sits on another card. */
  tone?: 'plain' | 'lifted';
}) {
  return (
    <View
      testID={testID}
      style={[s.card, tone === 'lifted' && s.cardLifted, style]}
    >
      {children}
    </View>
  );
}

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
        (pressed || disabled) && s.buttonPressed,
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

export function QuietButton({
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
        s.quiet,
        (pressed || disabled) && s.buttonPressed,
      ]}
    >
      <Text style={s.quietText}>{label}</Text>
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

/** A small pill: a sign, an interest, a dimension. */
export function Chip({
  top,
  bottom,
  testID,
}: {
  top?: string;
  bottom: string;
  testID?: string;
}) {
  return (
    <View style={s.chip} testID={testID}>
      {top === undefined ? null : <Text style={s.chipTop}>{top}</Text>}
      <Text style={s.chipBottom}>{bottom}</Text>
    </View>
  );
}

/**
 * The compatibility band as a ring: the design's centrepiece, with the
 * band's word where a percentage would have been. There is no percentage
 * in this product (ADR-0009 §3); the ring fills by band step so two cards
 * stay comparable at a glance without claiming a precision the method does
 * not have.
 */
export function BandRing({
  step,
  steps,
  name,
  testID,
}: {
  step: number;
  steps: number;
  name: string;
  testID?: string;
}) {
  const filled = Math.max(0, Math.min(1, step / steps));
  return (
    <View style={s.ringOuter} testID={testID}>
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[s.ring, { opacity: 0.35 + filled * 0.65 }]}
      >
        <View style={s.ringInner}>
          <Text style={s.ringName}>{name}</Text>
          <BandMeter step={step} steps={steps} />
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * Four rising bars with the first N filled — comparability without a
 * number. Used on the discover card, and inside the ring.
 */
export function BandMeter({
  step,
  steps,
  testID,
}: {
  step: number;
  steps: number;
  testID?: string;
}) {
  return (
    <View style={s.meter} testID={testID}>
      {Array.from({ length: steps }, (_, i) => (
        <View
          key={i}
          style={[
            s.meterStep,
            { height: 8 + i * 4 },
            i < step && s.meterStepOn,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * The brand mark, drawn rather than imported: two spheres on an orbit.
 * `assets/brand/mark.svg` is the source of truth for the exported icons;
 * this is the same idea in views, so the app needs no SVG runtime.
 */
export function OrbitMark({ size = 96 }: { size?: number }) {
  const dot = size * 0.3;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          s.orbit,
          {
            width: size * 0.92,
            height: size * 0.62,
            borderRadius: size,
            top: size * 0.19,
            left: size * 0.04,
          },
        ]}
      />
      <LinearGradient
        colors={[color.warm, color.pink]}
        style={{
          position: 'absolute',
          width: dot,
          height: dot,
          borderRadius: dot,
          left: size * 0.06,
          top: size * 0.5,
        }}
      />
      <LinearGradient
        colors={[color.cool, color.coolLight]}
        style={{
          position: 'absolute',
          width: dot * 0.86,
          height: dot * 0.86,
          borderRadius: dot,
          right: size * 0.04,
          top: size * 0.16,
        }}
      />
    </View>
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
  title: { ...type.title, color: color.text },
  label: {
    ...type.label,
    color: color.textFaint,
    marginTop: space.xl,
    marginBottom: space.xs,
  },
  body: { ...type.body, color: color.text },
  bodySmall: { ...type.bodySmall, color: color.textMuted },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.sm,
  },
  cardLifted: {
    backgroundColor: color.surfaceHigh,
    borderColor: color.borderStrong,
  },
  buttonWrap: { borderRadius: radius.pill, overflow: 'hidden' },
  buttonPressed: { opacity: 0.7 },
  button: { paddingVertical: 15, alignItems: 'center' },
  buttonText: { ...type.heading, color: color.onBright },
  quiet: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quietText: { ...type.heading, color: color.text, fontWeight: '500' },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
  chip: {
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    minWidth: 0,
  },
  chipTop: { ...type.caption, color: color.textFaint },
  chipBottom: { ...type.body, color: color.text, fontWeight: '600' },
  ringOuter: { alignItems: 'center', paddingVertical: space.sm },
  ring: {
    width: 188,
    height: 188,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  ringName: {
    ...type.title,
    color: color.text,
    textAlign: 'center',
    paddingHorizontal: space.md,
  },
  meter: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  meterStep: {
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  meterStepOn: { backgroundColor: color.pink },
  orbit: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: color.pink,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.85,
  },
});
