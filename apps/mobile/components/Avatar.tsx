import { Image, StyleSheet, Text, View } from 'react-native';
import type { PhotoSource } from '@/lib/photos';
import { initialOf } from '@/lib/thread-view';
import { color, font } from '@/theme/tokens';

/**
 * A person's first photo as a circle, or their initial on a raised
 * surface while the photo is on its way or cannot be shown. The two
 * states share a footprint so a list does not shift when a photo lands.
 * The source comes from `usePhotoSources` (ADR-0006: authorised per
 * request, never cached) — this only draws what it is handed.
 */
export function Avatar({
  name,
  source,
  size,
  testID,
}: {
  name: string;
  source: PhotoSource | null;
  size: number;
  testID?: string;
}) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  const id = testID === undefined ? {} : { testID };
  if (source === null) {
    return (
      <View
        style={[styles.fallback, round]}
        accessibilityRole="image"
        accessibilityLabel={name}
        {...id}
      >
        <Text
          style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}
          // The circle does not grow with the system text size; a letter
          // that did would leave it.
          maxFontSizeMultiplier={1}
        >
          {initialOf(name)}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={source}
      style={[styles.photo, round]}
      resizeMode="cover"
      accessibilityLabel={name}
      {...id}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: color.surfaceHigh,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: color.textMuted, fontFamily: font.semibold },
  photo: { backgroundColor: color.surfaceHigh },
});
