import {
  natalAspectTitleTr,
  PLANET_TR,
  SIGN_TR,
  formatDegree,
  natalReading,
} from '@stardate/astro';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchOwnProfile, type ProfileState } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { supabase } from '@/lib/supabase';

export default function ChartScreen() {
  const session = useSession();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  // Interpretation is computed by the engine; the screen only renders it.
  const reading = useMemo(
    () => (state.status === 'ready' ? natalReading(state.profile.chart) : null),
    [state],
  );

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t.errors.generic}</Text>
        <Pressable
          testID="retry"
          onPress={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          <Text style={styles.link}>{t.common.retry}</Text>
        </Pressable>
      </View>
    );
  }
  if (state.status !== 'ready' || !reading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#9a94b8" />
        <Text style={styles.muted}>{t.common.loading}</Text>
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
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>{t.chart.title}</Text>
          <Text style={styles.subtitle}>{profile.display_name}</Text>
          {profile.photos.length === 0 ? (
            <Link href="/profile" style={styles.nudge} testID="add-photo-nudge">
              {t.discover.completeProfile}
            </Link>
          ) : null}
        </View>
        <Link href="/discover" style={styles.navLink} testID="go-discover">
          {t.chart.discover}
        </Link>
      </View>

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
      <Text style={styles.body} testID="rising-text">
        {reading.risingText}
      </Text>

      <Text style={styles.section}>{t.chart.planets}</Text>
      {reading.planets.map(
        ({ planet, signText, houseText, retrogradeText }) => {
          const p = chart.planets[planet];
          return (
            <View key={planet} style={styles.card} testID={`planet-${planet}`}>
              <View style={styles.cardHead}>
                <Text style={styles.planetName}>{PLANET_TR[planet]}</Text>
                <Text style={styles.planetPos}>
                  {SIGN_TR[p.sign]} {formatDegree(p.degree)} · {p.house}.{' '}
                  {t.chart.house}
                  {p.retrograde ? ` ${t.chart.retrograde}` : ''}
                </Text>
              </View>
              <Text style={styles.body}>{signText}</Text>
              <Text style={styles.bodyMuted}>{houseText}</Text>
              {retrogradeText ? (
                <Text style={styles.bodyMuted}>{retrogradeText}</Text>
              ) : null}
            </View>
          );
        },
      )}

      <Text style={styles.section}>{t.chart.aspects}</Text>
      {reading.aspects.length === 0 ? (
        <Text style={styles.bodyMuted}>{t.chart.noAspects}</Text>
      ) : (
        reading.aspects.map(({ aspect, text }) => (
          <View
            key={`${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}
            style={styles.card}
            testID={`aspect-${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}
          >
            <Text style={styles.planetName}>
              {natalAspectTitleTr(aspect)}
              <Text style={styles.orb}>
                {' '}
                · {t.chart.orb(formatDegree(aspect.orb))}
              </Text>
            </Text>
            <Text style={styles.body}>{text}</Text>
          </View>
        ))
      )}

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
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  navLink: { color: '#c9c4e3', fontSize: 15, paddingTop: 8 },
  title: { color: '#f5f2ff', fontSize: 26, fontWeight: '700' },
  nudge: { color: '#7c6cff', fontSize: 14, paddingVertical: 6 },
  subtitle: { color: '#9a94b8', fontSize: 14 },
  section: { color: '#c9c4e3', fontSize: 13, letterSpacing: 1, marginTop: 20 },
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
  card: { backgroundColor: '#15142a', borderRadius: 12, padding: 12, gap: 6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  planetName: { color: '#f5f2ff', fontSize: 16, fontWeight: '600' },
  planetPos: {
    color: '#c9c4e3',
    fontSize: 14,
    textAlign: 'right',
    flexShrink: 1,
  },
  orb: { color: '#5f5a7a', fontSize: 12, fontWeight: '400' },
  body: { color: '#d9d5ef', fontSize: 14, lineHeight: 20 },
  bodyMuted: { color: '#9a94b8', fontSize: 13, lineHeight: 19 },
  signOut: { marginTop: 24, alignItems: 'center', padding: 12 },
  muted: { color: '#9a94b8' },
  link: { color: '#c9c4e3', padding: 12 },
});
