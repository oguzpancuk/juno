import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RADIUS_OPTIONS, updateRadius } from '@/lib/discover';
import { fetchOwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';

export default function Settings() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [radius, setRadius] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((p) => {
      if (!cancelled && p.status === 'ready') setRadius(p.profile.radius_km);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const [saving, setSaving] = useState(false);
  const choose = async (km: number) => {
    if (!userId || saving) return; // one request in flight at a time
    setError(null);
    setSaving(true);
    const previous = radius;
    setRadius(km);
    const ok = await updateRadius(userId, km);
    setSaving(false);
    if (!ok) {
      setRadius(previous);
      setError(t.errors.generic);
    }
  };

  return (
    <View style={styles.screen} testID="settings-screen">
      <Link href="/discover" style={styles.back}>
        {t.settings.back}
      </Link>
      <Text style={styles.title}>{t.settings.title}</Text>
      <Text style={styles.label}>{t.settings.radius}</Text>
      <View style={styles.row}>
        {RADIUS_OPTIONS.map((km) => (
          <Pressable
            key={km}
            testID={`radius-${km}`}
            style={[styles.chip, radius === km && styles.chipOn]}
            onPress={() => void choose(km)}
          >
            <Text style={styles.chipText}>{km} km</Text>
          </Pressable>
        ))}
      </View>
      {radius !== null && !RADIUS_OPTIONS.some((km) => km === radius) ? (
        <Text style={styles.hint}>{t.settings.customRadius(radius)}</Text>
      ) : null}
      <Text style={styles.hint}>{t.settings.radiusHint}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b0b1a',
    padding: 24,
    paddingTop: 64,
    gap: 12,
  },
  back: { color: '#9a94b8', fontSize: 14 },
  title: { color: '#f5f2ff', fontSize: 26, fontWeight: '700' },
  label: { color: '#c9c4e3', fontSize: 14, marginTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#15142a',
  },
  chipOn: { backgroundColor: '#7c6cff' },
  chipText: { color: '#f5f2ff' },
  hint: { color: '#5f5a7a', fontSize: 12 },
  error: { color: '#ff7b7b' },
});
