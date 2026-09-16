import { BANDS, type Band } from '@juno/astro';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Glow } from '@/components/ui';
import { color, gradient } from '@/theme/tokens';

/**
 * The band as a ring: the sheet's device, drawn small beside the word on
 * the deck and large around it on the match page (owner, 2026-09-16:
 * "halka her yerde"). The arc fills in quarters — one per band, from the
 * engine's own BANDS, so a reorder there cannot light the wrong share —
 * and no figure is drawn or spoken; the label is the band's word. Steps,
 * not a measure (ADR-0009 §2–§3).
 */
export function BandRing({
  band,
  size,
  stroke = 4,
  glow = false,
  label,
  children,
  testID,
}: {
  band: Band;
  size: number;
  stroke?: number;
  /** A soft light behind the ring, for the large one. */
  glow?: boolean;
  /** What a screen reader says for the ring — the band's word. */
  label: string;
  /** Centred inside the ring. */
  children?: ReactNode;
  testID?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (BANDS.indexOf(band) + 1) / BANDS.length;
  const halo = size * 1.6;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      role="img"
      aria-label={label}
      testID={testID ?? `band-ring-${band}`}
    >
      {glow ? (
        <Glow
          size={halo}
          style={{ top: -(halo - size) / 2, left: -(halo - size) / 2 }}
        />
      ) : null}
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="band-ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="0.5" stopColor={gradient[1]} />
            <Stop offset="1" stopColor={gradient[2]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color.track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#band-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
        />
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
