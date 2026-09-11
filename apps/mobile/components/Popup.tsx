import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientButton } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

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
  children,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Defaults to "Kapat". */
  closeLabel?: string;
  children: ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
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
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, space.lg) },
          ]}
        >
          {title === undefined ? null : (
            <Text style={styles.title}>{title}</Text>
          )}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
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
    paddingHorizontal: space.xl,
  },
  title: { ...type.title, color: color.text, marginBottom: space.md },
  // `flexGrow: 0` so a short sheet is short; `flexShrink: 1` so a long one
  // scrolls inside the sheet instead of pushing the button off the screen.
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: space.md, paddingBottom: space.md },
  action: { paddingTop: space.md },
});
