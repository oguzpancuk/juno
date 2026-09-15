import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GradientButton,
  SCREEN_PADDING,
  TopGapContextProvider,
} from '@/components/ui';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/**
 * Lets a control inside a sheet hold the sheet still while it is being
 * dragged. A slider's drag is a JS gesture, and the sheet's scroll view is
 * a native one that takes over any touch that moves far enough — up and
 * down a little is enough — so without this a sideways drag on a thumb
 * turns into the sheet scrolling and the thumb stops. Taken only once a
 * touch has been read as a drag, never on touch-down, so a scroll that
 * starts on a slider still scrolls. Outside a sheet it does nothing.
 */
const SheetScrollLock = createContext<(locked: boolean) => void>(() => {});

export function useSheetScrollLock(): (locked: boolean) => void {
  return useContext(SheetScrollLock);
}

/**
 * The one popup in the product (owner, 2026-09-11): the screen behind it
 * dims, a sheet rises from the bottom, and there is exactly one button,
 * which closes it. Anything else the sheet needs to do it does inside its
 * own content; a second button would turn it into a dialog, and the
 * owner asked for a popup.
 *
 * A native `Modal`, not an in-tree overlay: it sits above the tab bar as
 * well, which is what a dimmed background means on iOS, and react-native-
 * web ships `Modal` (unlike `Alert`, which it renders as a no-op —
 * docs/NOTES.md). The backdrop and the hardware back both close it too,
 * because a sheet that can only be dismissed by its button traps anyone
 * whose thumb cannot reach it.
 */
export function Popup({
  visible,
  onClose,
  title,
  closeLabel,
  bleed = false,
  onDismissed,
  contentKey,
  children,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  /**
   * Called once the sheet is fully off the screen. Navigate from here, not
   * from `onClose`: on iOS a push or replace issued while the modal is
   * still animating away is silently dropped, which is how "Engellediklerin"
   * once closed the settings sheet and opened nothing.
   */
  onDismissed?: () => void;
  /**
   * Change it to scroll the body back to the top — for a sheet that swaps
   * what it shows, where a long page left scrolled would otherwise open
   * the next one halfway down. The children are not remounted, so their
   * state survives the swap.
   */
  contentKey?: string;
  /** Defaults to "Kapat". */
  closeLabel?: string;
  children: ReactNode;
  testID?: string;
} & (
  | { title?: string; bleed?: false }
  // A bleed sheet has nowhere above the photo to put a title, so the type
  // forbids passing one rather than letting it be drawn underneath.
  | { title?: undefined; bleed: true }
)) {
  const insets = useSafeAreaInsets();
  const [locked, setLocked] = useState(false);
  // Scrolled back, not remounted by a key: a remount would take the
  // children's state with it — a delete in flight in the settings sheet
  // among it, which would unlock its button (review, 2026-09-15).
  const body = useRef<ScrollView>(null);
  useEffect(() => {
    body.current?.scrollTo({ y: 0, animated: false });
  }, [contentKey]);
  // Android never fires Modal's `onDismiss`; there the sheet is gone as soon
  // as `visible` is false. A ref, so a new callback identity does not re-run
  // this on every render.
  const dismissed = useRef(onDismissed);
  useEffect(() => {
    dismissed.current = onDismissed;
  });
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (Platform.OS === 'android' && wasVisible.current && !visible)
      dismissed.current?.();
    wasVisible.current = visible;
  }, [visible]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={() => dismissed.current?.()}
    >
      <View style={styles.layer} testID={testID}>
        {/* A tap target for sighted users only: VoiceOver gets the one
            Kapat button below, not a second full-screen one. */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          importantForAccessibility="no"
        />
        {/* The one raw `insets.bottom` left in the app (lib/insets.ts has
            the other). A Modal is its own window, above the tab bar, so
            nothing else covers the home indicator for this sheet — a
            screen inside the tabs must not copy it. */}
        <View
          style={[
            styles.sheet,
            bleed && styles.sheetBleed,
            { paddingBottom: Math.max(insets.bottom, space.lg) },
          ]}
        >
          {title === undefined ? null : (
            <Text style={styles.title}>{title}</Text>
          )}
          {/* The gutter belongs to the scroll view's content, not to the
              sheet: on the sheet it clips, and a child that cancels it to
              run edge to edge (ProfileView's carousel) would lose that
              much of itself off both sides instead of growing into it.
              Same measurement as `Screen`, so a component laid out for
              one host is laid out for the other. */}
          <ScrollView
            ref={body}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            // Only a bleed sheet: the titled ones have a gap above their
            // content and nothing to reveal by rubber-banding into it.
            bounces={!bleed}
            overScrollMode={bleed ? 'never' : 'auto'}
            scrollEnabled={!locked}
          >
            {/* Always, bleed or not. A Modal renders its children in the
                same React tree, so a sheet opened from inside a bleed
                `Screen` would otherwise inherit that screen's 68 and a
                child would cancel a padding this host never applied. */}
            <TopGapContextProvider value={0}>
              <SheetScrollLock.Provider value={setLocked}>
                {children}
              </SheetScrollLock.Provider>
            </TopGapContextProvider>
          </ScrollView>
          <View style={styles.action}>
            <GradientButton
              label={closeLabel ?? t.common.close}
              onPress={onClose}
              {...(testID === undefined ? {} : { testID: `${testID}-close` })}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.scrim,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderStrong,
    paddingTop: space.xl,
    overflow: 'hidden',
  },
  // The gap is the sheet's, above the scroll view, so only the sheet can
  // give it up — a negative margin inside the scroll view would land above
  // offset 0 and be clipped. Giving it up here drops the photo onto the
  // sheet's border box, where `overflow: hidden` rounds it into the
  // corners (owner, 2026-09-14: the photo must cover the top of the popup).
  sheetBleed: { paddingTop: 0 },
  title: {
    ...type.title,
    color: color.text,
    marginBottom: space.md,
    paddingHorizontal: SCREEN_PADDING,
  },
  // `flexGrow: 0` so a short sheet is short; `flexShrink: 1` so a long one
  // scrolls inside the sheet instead of pushing the button off the screen.
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: {
    gap: space.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: space.md,
  },
  action: { paddingTop: space.md, paddingHorizontal: SCREEN_PADDING },
});
