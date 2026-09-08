import { PLANETS, PLANET_TR, SIGN_TR, formatDegree } from '@stardate/astro';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { placementLine } from '@/lib/chartText';
import { fetchOwnProfile, type ProfileState } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { supabase } from '@/lib/supabase';

export default function ChartScreen() {
  const session = useSession();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  useEffect(() => {
    if (session.status !== 'signed-in') return;
    let cancelled = false;
    void fetchOwnProfile(session.session.user.id).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (state.status !== 'ready') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#9a94b8" />
        <Text style={styles.muted}>
          {state.status === 'error' ? state.message : t.common.loading}
        </Text>
      </View>
    );
  }

  const { profile } = state;
  const { chart, big_three: three } = profile;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="chart-screen"
    >
      <Text style={styles.title}>{t.chart.title}</Text>
      <Text style={styles.subtitle}>{profile.display_name}</Text>

      <Text style={styles.section}>{t.chart.bigThree}</Text>
      <View style={styles.row}>
        <Badge
          label={t.chart.sun}
          value={SIGN_TR[three.sun]}
          testID="badge-sun"
        />
        <Badge
          label={t.chart.moon}
          value={SIGN_TR[three.moon]}
          testID="badge-moon"
        />
        <Badge
          label={t.chart.rising}
          value={SIGN_TR[three.rising]}
          testID="badge-rising"
        />
      </View>

      <Text style={styles.section}>{t.chart.planets}</Text>
      {PLANETS.map((planet) => {
        const p = chart.planets[planet];
        return (
          <View
            key={planet}
            style={styles.planetRow}
            testID={`planet-${planet}`}
          >
            <View style={styles.planetHead}>
              <Text style={styles.planetName}>{PLANET_TR[planet]}</Text>
              <Text style={styles.planetPos}>
                {SIGN_TR[p.sign]} {formatDegree(p.degree)} · {p.house}.{' '}
                {t.chart.house}
                {p.retrograde ? ` ${t.chart.retrograde}` : ''}
              </Text>
            </View>
            <Text style={styles.planetText}>
              {placementLine(planet, p.sign)}
            </Text>
          </View>
        );
      })}

      <Pressable
        testID="sign-out"
        style={styles.signOut}
        onPress={() => {
          void supabase.auth.signOut().then(() => router.replace('/sign-in'));
        }}
      >
        <Text style={styles.muted}>{t.chart.signOut}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Badge({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID: string;
}) {
  return (
    <View style={styles.badge} testID={testID}>
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={styles.badgeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0b1a' },
  content: { padding: 24, paddingTop: 64, gap: 8, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b0b1a',
  },
  title: { color: '#f5f2ff', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9a94b8', fontSize: 14 },
  section: {
    color: '#c9c4e3',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
  },
  row: { flexDirection: 'row', gap: 8 },
  badge: {
    flex: 1,
    backgroundColor: '#15142a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  badgeLabel: { color: '#9a94b8', fontSize: 12 },
  badgeValue: {
    color: '#f5f2ff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  planetRow: {
    backgroundColor: '#15142a',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  planetHead: { flexDirection: 'row', justifyContent: 'space-between' },
  planetName: { color: '#f5f2ff', fontSize: 16, fontWeight: '600' },
  planetPos: { color: '#c9c4e3', fontSize: 14 },
  planetText: { color: '#9a94b8', fontSize: 13 },
  signOut: { marginTop: 24, alignItems: 'center', padding: 12 },
  muted: { color: '#9a94b8' },
});
