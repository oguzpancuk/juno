import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '@/lib/strings';
import { color, font } from '@/theme/tokens';

/**
 * "Something went wrong" and a way to try again, filling the screen. The
 * entry screen shows it when the profile cannot be read, and the tabs'
 * notice gate when the record cannot be (components/TabStack.tsx): one
 * component, so the two doors read the same (review of #19, round 2).
 */
export function ErrorRetry({
  onRetry,
  retryTestID,
  testID,
}: {
  onRetry: () => void;
  /** Keeps each screen's existing test IDs (`retry`, …). */
  retryTestID: string;
  testID?: string;
}) {
  return (
    <View style={styles.center} testID={testID}>
      <Text style={styles.text}>{t.errors.generic}</Text>
      <Pressable testID={retryTestID} role="button" onPress={onRetry}>
        <Text style={styles.link}>{t.common.retry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: color.bg,
  },
  text: { fontFamily: font.regular, color: color.textMuted },
  link: { fontFamily: font.regular, color: color.textMuted, padding: 12 },
});
