import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { color, radius, space, type } from '@/theme/tokens';

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
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
  orbit: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: color.pink,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.85,
  },
});
