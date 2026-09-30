import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OutlineButton } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, font, radius, space, type } from '@/theme/tokens';

/**
 * The last step before an account is deleted: what goes, the one red
 * button, and a way back. In-page, not `Alert.alert`: react-native-web
 * renders Alert as a no-op, so on the web client the delete never
 * happened. Settings and `/consent` both show it (review of #19: one
 * component, so the two cannot drift).
 */
export function DeleteAccountConfirm({
  deleting,
  disabled = false,
  onConfirm,
  onCancel,
  testIDPrefix = '',
}: {
  deleting: boolean;
  /** Something else on the screen is saving (`/consent`'s accept). */
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Keeps each screen's existing test IDs (`delete-confirm`, …). */
  testIDPrefix?: string;
}) {
  const off = deleting || disabled;
  return (
    <View style={styles.confirm} testID={`${testIDPrefix}delete-confirm`}>
      <Text style={styles.hint}>{t.safety.deleteConfirm}</Text>
      <Pressable
        testID={`${testIDPrefix}delete-yes`}
        role="button"
        disabled={off}
        style={({ pressed }) => [styles.danger, (pressed || off) && styles.dim]}
        onPress={onConfirm}
      >
        <Text style={styles.dangerText}>
          {deleting ? t.safety.deleting : t.safety.deleteTitle}
        </Text>
      </Pressable>
      <OutlineButton
        label={t.safety.cancel}
        disabled={off}
        onPress={onCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  confirm: { gap: space.sm },
  hint: {
    fontFamily: font.regular,
    color: color.textFaint,
    fontSize: 12,
    lineHeight: 18,
  },
  danger: {
    backgroundColor: color.dangerSurface,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dangerText: { ...type.body, color: color.danger, fontFamily: font.semibold },
  dim: { opacity: 0.6 },
});
