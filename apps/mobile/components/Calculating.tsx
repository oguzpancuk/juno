import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OrbitMark } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, space, type } from '@/theme/tokens';

/** One turn of the mark. Slow on purpose: this is a pause, not a spinner. */
const TURN_MS = 14000;
/**
 * How long each line of copy stays up. The onboarding screen's minimum
 * hold is the whole sequence, so every line is actually read; with the
 * two set independently the hold was one line long and the rest never
 * appeared.
 */
export const STEP_MS = 950;

/**
 * The beat between giving your birth details and seeing your chart.
 *
 * The work behind it is a few hundred milliseconds of arithmetic, so this
 * is held for a minimum time by whoever shows it (see MIN_VISIBLE_MS in
 * the onboarding screen). That is not a fake progress bar: nothing here
 * claims to know how far along it is — it says what is being done, in the
 * order it is being done.
 */
export function Calculating() {
  // State, not a ref: the value is read during render (the interpolation
  // below), and a ref read there is exactly what the lint rule is for.
  // The initialiser is lazy, so the Animated.Value is created once.
  const [spin] = useState(() => new Animated.Value(0));
  const [step, setStep] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: TURN_MS,
        easing: Easing.linear,
        // react-native-web has no native driver and warns once per app run.
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [spin]);

  useEffect(() => {
    // Advances to the last line and stays there. Cycling back to the first
    // would read as a stall on a slow connection, which is the one time
    // this screen is up for longer than its minimum hold.
    const tick = setInterval(() => {
      setStep((at) => Math.min(at + 1, t.calculating.steps.length - 1));
    }, STEP_MS);
    return () => {
      clearInterval(tick);
    };
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.screen} testID="calculating">
      <Animated.View style={{ transform: [{ rotate }] }}>
        <OrbitMark size={112} />
      </Animated.View>
      <Text style={styles.title}>{t.calculating.title}</Text>
      <Text style={styles.step} testID="calculating-step">
        {t.calculating.steps[step]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  title: { ...type.display, color: color.text, textAlign: 'center' },
  step: {
    ...type.body,
    color: color.textMuted,
    textAlign: 'center',
    // Two of the lines wrap on a narrow phone; a fixed box keeps the title
    // from stepping up and down as they cycle.
    minHeight: 48,
  },
});
