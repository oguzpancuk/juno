import { useEffect, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type PanResponderInstance,
} from 'react-native';
import { useSheetScrollLock } from '@/components/Popup';
import {
  moveThumb,
  nearerThumb,
  readTouch,
  stopAt,
  stopX,
  thumbForDirection,
  type Thumb,
} from '@/lib/track';
import { color } from '@/theme/tokens';

const THUMB = 28;
/** The touch band: the thumb is 28pt, the finger needs 44. */
const BOX = 44;
const RAIL = 4;
const TICK = 6;

export type TrackValues = readonly [number] | readonly [number, number];

/**
 * A slider over `count` evenly spaced stops, with one thumb or two
 * (owner, 2026-09-15: radius and age "daha kolay seçilmeli"). Values are
 * stop numbers; what a stop means is the caller's.
 *
 * Controlled. A drag reports every stop it crosses through `onChange`, so
 * the caller can write the value above the track as it moves, and reports
 * once through `onCommit` when the finger lifts on a different stop than
 * it started from — the one moment worth a database write. A drag that
 * ends where it began, or is taken away, reports `onCancel` instead, so
 * the caller can drop what it was showing. A tap on the track jumps the
 * nearer thumb to it when the finger lifts.
 *
 * Nothing moves until the touch has shown what it is: a touch that heads
 * up or down is the sheet's scroll, and the track lets it go without
 * having changed anything.
 *
 * Built on `PanResponder`, the deck's own gesture, rather than a slider
 * package: React Native's own slider has one thumb, and a range needs two.
 */
export function Track({
  count,
  values,
  onChange,
  onCommit,
  onCancel,
  describe,
  labels,
  ticks = false,
  disabled = false,
  testID,
}: {
  count: number;
  values: TrackValues;
  onChange: (values: TrackValues) => void;
  onCommit: (values: TrackValues) => void;
  onCancel: () => void;
  /** What a screen reader says for a stop. */
  describe: (stop: number) => string;
  /** One accessibility label per thumb, low first. */
  labels: readonly string[];
  /** Draw a dot at every stop — for a handful of stops, not for 82. */
  ticks?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const lock = useSheetScrollLock();
  const [width, setWidth] = useState(0);
  const inner = Math.max(0, width - THUMB);

  const [gesture] = useState(
    () =>
      new TrackGesture({
        inner,
        values,
        count,
        disabled,
        onChange,
        onCommit,
        onCancel,
        lock,
      }),
  );
  // After render, which is soon enough: during a drag the only value that
  // changes is the one the gesture itself is producing.
  useEffect(() => {
    gesture.update({
      inner,
      values,
      count,
      disabled,
      onChange,
      onCommit,
      onCancel,
      lock,
    });
  });
  // A sheet closed under a finger unmounts the track without a release.
  useEffect(() => () => lock(false), [lock]);

  // A screen reader cannot drag: each thumb is an adjustable element that
  // steps one stop per swipe, and every step is a commit.
  const step = (index: number, delta: number) => {
    let next: TrackValues;
    if (values.length === 1) {
      next = [Math.max(0, Math.min(count - 1, values[0] + delta))];
    } else {
      const thumb: Thumb = index === 0 ? 'low' : 'high';
      const range = moveThumb(
        { low: values[0], high: values[1] },
        thumb,
        values[index === 0 ? 0 : 1] + delta,
        count,
      );
      next = [range.low, range.high];
    }
    if (!same(next, values)) onCommit(next);
  };

  const xs = values.map((value) => stopX(value, inner, count));
  const from = values.length === 1 ? 0 : (xs[0] ?? 0);
  const to = values.length === 1 ? (xs[0] ?? 0) : (xs[1] ?? 0);

  return (
    <View
      testID={testID}
      style={[styles.box, disabled && styles.off]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      {...gesture.responder.panHandlers}
    >
      <View style={styles.layer} pointerEvents="none">
        <View style={styles.rail} />
        <View
          style={[styles.active, { left: THUMB / 2 + from, width: to - from }]}
        />
        {ticks && inner > 0
          ? Array.from({ length: count }, (_, stop) => {
              const x = stopX(stop, inner, count);
              const on = x >= from && x <= to;
              return (
                <View
                  key={stop}
                  style={[
                    styles.tick,
                    on && styles.tickOn,
                    { left: THUMB / 2 + x - TICK / 2 },
                  ]}
                />
              );
            })
          : null}
        {values.map((value, index) => (
          <View
            key={index}
            testID={testID === undefined ? undefined : `${testID}-${index}`}
            style={[styles.thumb, { left: xs[index] ?? 0 }]}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={labels[index]}
            accessibilityValue={{ text: describe(value) }}
            accessibilityState={{ disabled }}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
            ]}
            onAccessibilityAction={(event) => {
              if (disabled) return;
              const name = event.nativeEvent.actionName;
              if (name === 'increment') step(index, 1);
              if (name === 'decrement') step(index, -1);
            }}
          />
        ))}
      </View>
    </View>
  );
}

type GestureProps = {
  inner: number;
  values: TrackValues;
  count: number;
  disabled: boolean;
  onChange: (values: TrackValues) => void;
  onCommit: (values: TrackValues) => void;
  onCancel: () => void;
  lock: (locked: boolean) => void;
};

/**
 * The drag, made once per track and told the latest props after every
 * render. Made once because a responder remade mid-drag starts from an
 * empty gesture state, and this one is remade-worthy on every stop it
 * crosses; a class held in state rather than refs read from the handlers,
 * because the lint rule refuses a ref handed to a function built during
 * render (the deck met the same rule, see `createDeckResponder`).
 *
 * The touch is claimed when it goes down, so a tap is heard, but nothing
 * visible happens until `readTouch` has read it: a drag jumps the thumb
 * and holds the sheet still from that move on, a scroll is handed back to
 * the sheet untouched, and a touch that lifts unread is a tap (review,
 * 2026-09-15).
 */
class TrackGesture {
  private props: GestureProps;
  private touch: { x: number; read: 'drag' | 'scroll' | null } | null = null;
  private drag: {
    from: TrackValues;
    thumb: Thumb | null;
    last: TrackValues;
  } | null = null;
  readonly responder: PanResponderInstance;

  constructor(props: GestureProps) {
    this.props = props;
    this.responder = PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !this.props.disabled && this.props.inner > 0,
      // Android: a vertical move has to be able to reach the scroll view.
      // iOS takes no notice of this flag.
      onShouldBlockNativeResponder: () => false,
      // The sheet may have the touch until it is a drag, and not after.
      onPanResponderTerminationRequest: () => this.drag === null,
      onPanResponderGrant: (event) => {
        // Every child ignores touches, so this is always measured from
        // the track's own left edge, never from a thumb's.
        this.touch = { x: event.nativeEvent.locationX, read: null };
      },
      onPanResponderMove: (_, g) => {
        const t = this.touch;
        if (!t || t.read === 'scroll') return;
        if (t.read === null) {
          t.read = readTouch(g.dx, g.dy);
          if (t.read !== 'drag') return;
          this.begin(t.x);
          this.props.lock(true);
        }
        // Measured from touch-down: the grant ran when the finger landed.
        this.place(t.x + g.dx, g.dx);
      },
      onPanResponderRelease: () => {
        const t = this.touch;
        if (t !== null && t.read === null) {
          this.begin(t.x);
          this.place(t.x, 0);
        }
        this.finish(true);
      },
      onPanResponderTerminate: () => this.finish(false),
    });
  }

  update(props: GestureProps) {
    this.props = props;
  }

  /** Pick the thumb a touch at `x` takes, from the values as they are now. */
  private begin(x: number) {
    const { inner, count, values } = this.props;
    const stop = stopAt(x - THUMB / 2, inner, count);
    this.drag = {
      from: values,
      thumb:
        values.length === 1
          ? 'low'
          : nearerThumb(stop, { low: values[0], high: values[1] }),
      last: values,
    };
  }

  private place(x: number, dx: number) {
    const d = this.drag;
    if (!d) return;
    const { inner, count } = this.props;
    const stop = stopAt(x - THUMB / 2, inner, count);
    let next: TrackValues;
    if (d.from.length === 1) {
      next = [stop];
    } else {
      // Both thumbs on one stop: nothing moves until the finger says
      // which way it is going.
      if (d.thumb === null) d.thumb = thumbForDirection(dx);
      if (d.thumb === null) return;
      const range = moveThumb(
        { low: d.from[0], high: d.from[1] },
        d.thumb,
        stop,
        count,
      );
      next = [range.low, range.high];
    }
    if (same(next, d.last)) return;
    d.last = next;
    this.props.onChange(next);
  }

  private finish(commit: boolean) {
    const d = this.drag;
    this.drag = null;
    this.touch = null;
    this.props.lock(false);
    // Read as a scroll: nothing was shown, so there is nothing to undo.
    if (!d) return;
    if (commit && !same(d.last, d.from)) this.props.onCommit(d.last);
    else this.props.onCancel();
  }
}

function same(a: TrackValues, b: TrackValues): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

const styles = StyleSheet.create({
  box: { height: BOX, justifyContent: 'center' },
  off: { opacity: 0.4 },
  layer: StyleSheet.absoluteFill,
  rail: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    top: (BOX - RAIL) / 2,
    height: RAIL,
    borderRadius: RAIL / 2,
    backgroundColor: color.borderStrong,
  },
  active: {
    position: 'absolute',
    top: (BOX - RAIL) / 2,
    height: RAIL,
    borderRadius: RAIL / 2,
    backgroundColor: color.cool,
  },
  tick: {
    position: 'absolute',
    top: (BOX - TICK) / 2,
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
    backgroundColor: color.borderStrong,
  },
  tickOn: { backgroundColor: color.coolLight },
  thumb: {
    position: 'absolute',
    top: (BOX - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: color.text,
    borderWidth: 3,
    borderColor: color.cool,
  },
});
