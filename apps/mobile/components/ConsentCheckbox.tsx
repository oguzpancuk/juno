import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font } from '@/theme/tokens';

/**
 * The box a consent is given with: onboarding's (the first consent) and
 * `/consent`'s (the notice accepted again). One component so a fix to
 * either — the role and state a screen reader needs, the copy's style —
 * lands on both (review of #19).
 *
 * No `aria-label`: the sentence beside the box is the name, and a label
 * of its own on the Pressable would hide it (docs/NOTES.md).
 */
export function ConsentCheckbox({
  checked,
  onToggle,
  label,
  disabled = false,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      style={styles.row}
      onPress={onToggle}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: color.cool, borderColor: color.cool },
  tick: { color: color.onBright, fontSize: 14, lineHeight: 18 },
  text: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
});
