import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useReducedMotion } from '@/lib/a11y';

/** How fast the line travels, in points a second. Slow on purpose. */
const SPEED = 24;
/** How long it rests at each end, so both ends can actually be read. */
const HOLD_MS = 2200;
/** Sub-point differences are rounding, not overflow. */
const SLACK = 1;

/**
 * One line that never wraps and moves itself when it does not fit (owner,
 * 2026-09-23: "meslek ve okul asla alt satira tasmasin. gerekirse
 * yavasca saga sola oynayan text olabilir").
 *
 * The horizontal `ScrollView` is how the line gets measured, not how it
 * moves. Laid out anywhere else, a `<Text numberOfLines={1}>` is measured
 * against the box it sits in and reports the box's width however long the
 * string is, so there is nothing to compare and no way to know whether it
 * overflowed. A scroll view lays its content out with no width to fit
 * into, so `onContentSizeChange` is the width the line really wants and
 * `onLayout` is the width it has.
 *
 * It never scrolls by hand — `scrollEnabled` is false, so a finger on it
 * still belongs to the page underneath, which on the profile page is a
 * scroll view of its own. The travel is an animation over `translateX`.
 *
 * With Reduce Motion on there is no marquee at all: a plain one-line
 * `<Text>` ending in an ellipsis. Cutting the tail off a word is a better
 * answer than moving the page for someone who asked for less movement,
 * and it still never wraps, which is the part the owner asked for.
 */
export function Marquee({
  children,
  style,
  accessibilityLabel,
  testID,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  /** For a value that is drawn rather than written, as the dash is. */
  accessibilityLabel?: string | undefined;
  testID?: string | undefined;
}) {
  const still = useReducedMotion();
  const [box, setBox] = useState(0);
  const [line, setLine] = useState(0);
  const [shift] = useState(() => new Animated.Value(0));
  const travel = line - box;
  const over = box > 0 && travel > SLACK;

  useEffect(() => {
    if (still || !over) {
      shift.setValue(0);
      return;
    }
    const leg = (to: number) =>
      Animated.timing(shift, {
        toValue: to,
        duration: (travel / SPEED) * 1000,
        // Eased at both ends: a line that starts and stops abruptly reads
        // as a glitch, where one that gathers and settles reads as a
        // line making room for itself.
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      });
    const run = Animated.loop(
      Animated.sequence([
        Animated.delay(HOLD_MS),
        leg(-travel),
        Animated.delay(HOLD_MS),
        leg(0),
      ]),
    );
    run.start();
    return () => {
      run.stop();
      shift.setValue(0);
    };
  }, [still, over, travel, shift]);

  if (still) {
    return (
      <Text
        style={style}
        numberOfLines={1}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </Text>
    );
  }
  return (
    <ScrollView
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      // `flexGrow: 0` so it is as tall as its line: a scroll view left to
      // itself in a column takes the height that is going.
      style={styles.clip}
      onLayout={(event) => setBox(event.nativeEvent.layout.width)}
      onContentSizeChange={(width) => setLine(width)}
      testID={testID}
    >
      <Animated.Text
        style={[style, { transform: [{ translateX: shift }] }]}
        numberOfLines={1}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Animated.Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  clip: { flexGrow: 0 },
});
