import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BlurView } from 'expo-blur';
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
import { CosmicGround } from '@/components/CosmicGround';
import {
  BackChevron,
  SCREEN_PADDING,
  TopGapContextProvider,
} from '@/components/ui';
import { ScrollLock } from '@/lib/scroll-lock';
import { t } from '@/lib/strings';
import { color, glass, radius, space, type } from '@/theme/tokens';

/**
 * The one popup in the product (owner, 2026-09-11): the screen behind it
 * dims, a sheet rises from the bottom, and there is exactly one way out of
 * it, which closes it. Anything else the sheet needs to do it does inside
 * its own content; a second button would turn it into a dialog, and the
 * owner asked for a popup.
 *
 * That way out is the chat header's back chevron at the sheet's top left,
 * beside the title, not a full-width "Kapat" under the content (owner,
 * 2026-09-24: "kapat butonları en alttaki full butondan sol üstte geriye
 * dönüş olsun, mesajlardaki geri butonu gibi"). It keeps "Kapat" as its
 * spoken name, so VoiceOver and the web still announce what it does.
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
  onBack,
  backLabel,
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
  /**
   * What the top-left chevron (and the hardware back) does, for a sheet
   * with pages of its own — settings' blocked list and privacy text go
   * back to the settings list. Defaults to `onClose`; the backdrop always
   * closes.
   */
  onBack?: () => void;
  /** The chevron's spoken name. Defaults to "Kapat". */
  backLabel?: string;
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
  const back = (
    <BackChevron
      glyph={t.common.backGlyph}
      accessibilityLabel={backLabel ?? t.common.close}
      onPress={onBack ?? onClose}
      {...(testID === undefined ? {} : { testID: `${testID}-close` })}
    />
  );
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
      onRequestClose={onBack ?? onClose}
      onDismiss={() => dismissed.current?.()}
    >
      <View style={styles.layer} testID={testID}>
        {/* A tap target for sighted users only: VoiceOver gets the
            chevron at the sheet's top left, not a second full-screen
            button. */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          aria-hidden
          // Not a tab stop: on the web a Pressable is focusable by default,
          // and a hidden element that takes focus is a contradiction a
          // keyboard user lands on (review, 2026-09-16).
          tabIndex={-1}
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
          {/* The sheet sits over a page — a photo, usually — so on iOS and
              the web that page shows through a blur (owner, 2026-09-16);
              Android has no blur here and gets the tint. The sky under
              the sheet's own content is its own. */}
          <BlurView
            intensity={85}
            tint="dark"
            style={styles.fill}
            pointerEvents="none"
          />
          <CosmicGround planet={false} horizon={false} />
          {/* The chat header's row: the way out, then what this is. A
              bleed sheet has no row — its photo runs to the top — so the
              chevron is drawn over the photo instead, below. */}
          {bleed ? null : (
            <View style={styles.header}>
              {back}
              {title === undefined ? null : (
                <Text style={styles.title}>{title}</Text>
              )}
            </View>
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
                `Screen` would otherwise inherit that screen's clearance and a
                child would cancel a padding this host never applied. */}
            <TopGapContextProvider value={0}>
              <ScrollLock.Provider value={setLocked}>
                {children}
              </ScrollLock.Provider>
            </TopGapContextProvider>
          </ScrollView>
          {bleed ? <View style={styles.overPhoto}>{back}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
    backgroundColor: glass.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: glass.edge,
    paddingTop: space.sm,
    overflow: 'hidden',
  },
  // The gap is the sheet's, above the scroll view, so only the sheet can
  // give it up — a negative margin inside the scroll view would land above
  // offset 0 and be clipped. Giving it up here drops the photo onto the
  // sheet's border box, where `overflow: hidden` rounds it into the
  // corners (owner, 2026-09-14: the photo must cover the top of the popup).
  sheetBleed: { paddingTop: 0 },
  // The chat header's measurements: the gutter, then the chevron's 44pt
  // box and the title beside it, and a gap before the content.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: space.sm,
  },
  // `flexShrink` so a long title yields to the chevron, as in the chat.
  title: { ...type.title, color: color.text, flexShrink: 1 },
  // Over the photo, in the same place the header row would put it.
  overPhoto: {
    position: 'absolute',
    top: space.sm,
    left: SCREEN_PADDING,
  },
  // `flexGrow: 0` so a short sheet is short; `flexShrink: 1` so a long one
  // scrolls inside the sheet instead of pushing the button off the screen.
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: {
    gap: space.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: space.md,
  },
});
