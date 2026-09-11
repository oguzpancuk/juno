import { BANDS, LEVELS, type Band, type Level } from '@juno/astro';
import { StyleSheet, View } from 'react-native';
import { color } from '@/theme/tokens';

/**
 * Steps, not a number. A meter keeps cards comparable at a glance without
 * asserting a precision the method does not have (ADR-0009 §2–§3): the
 * bars carry the level, the word next to them carries the meaning, and no
 * figure is ever passed to a `Text`.
 *
 * `filled` is 1-based: the first `filled` of `steps` bars are lit.
 */
export function Meter({
  steps,
  filled,
  accessibilityLabel,
  testID,
}: {
  steps: number;
  filled: number;
  accessibilityLabel: string;
  testID?: string;
}) {
  return (
    <View
      style={styles.meter}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      {...(testID === undefined ? {} : { testID })}
    >
      {Array.from({ length: steps }, (_, i) => (
        <View
          key={i}
          style={[
            styles.step,
            { height: 10 + i * 5 },
            i < filled && styles.stepOn,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * The overall band as four steps. The count and the order come from the
 * engine's own BANDS, so a reorder there cannot silently light the wrong
 * number of bars here.
 */
export function BandMeter({ band, label }: { band: Band; label: string }) {
  return (
    <Meter
      steps={BANDS.length}
      filled={BANDS.indexOf(band) + 1}
      accessibilityLabel={label}
      testID={`band-meter-${band}`}
    />
  );
}

/**
 * One dimension's level as three steps, the same bars as the band meter
 * (owner, 2026-09-11: score the categories with bars, not with a word).
 * The word is not lost — it is the accessibility label, so VoiceOver
 * still reads "Kolay yakınlık" where a sighted user sees three lit bars.
 */
export function LevelMeter({ level, label }: { level: Level; label: string }) {
  return (
    <Meter
      steps={LEVELS.length}
      filled={LEVELS.indexOf(level) + 1}
      accessibilityLabel={label}
      testID={`level-meter-${level}`}
    />
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  step: { width: 7, borderRadius: 3, backgroundColor: color.track },
  stepOn: { backgroundColor: color.pink },
});
