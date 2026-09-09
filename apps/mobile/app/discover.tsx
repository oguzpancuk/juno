import { SIGN_TR, synastryReading } from '@stardate/astro';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  fetchCandidates,
  swipe,
  type Candidate,
  type DiscoverState,
} from '@/lib/discover';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';

export default function Discover() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [me, setMe] = useState<OwnProfile | null>(null);
  const [state, setState] = useState<DiscoverState>({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [attempt, setAttempt] = useState(0);

  // Own profile first (for the chart), then the candidates scored against it.
  // State is set from promise callbacks, never synchronously in the effect.

  // On focus, not on mount: settings can change the radius or the stored
  // location while this screen stays mounted behind it, and the candidate
  // list is computed from both.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      fetchOwnProfile(userId)
        .then(async (profile) => {
          if (profile.status === 'missing')
            return { status: 'missing' as const, me: null };
          if (profile.status !== 'ready')
            return { status: 'error' as const, me: null };
          const next = await fetchCandidates(profile.profile.chart);
          return { ...next, me: profile.profile };
        })
        .then((result) => {
          if (cancelled) return;
          if (result.status === 'missing') {
            router.replace('/onboarding');
            return;
          }
          setMe(result.me);
          setState(result.status === 'error' ? { status: 'error' } : result);
        })
        .catch(() => {
          if (!cancelled) setState({ status: 'error' });
        });
      return () => {
        cancelled = true;
      };
    }, [userId, attempt]),
  );

  const act = async (candidate: Candidate, kind: 'like' | 'pass') => {
    if (!me || busy) return;
    setBusy(true);
    setError(null);
    const result = await swipe(
      { id: me.id, chart: me.chart },
      { id: candidate.row.id, chart: candidate.row.chart },
      kind,
    );
    setBusy(false);
    const drop = () => {
      setState((s) =>
        s.status === 'ready'
          ? {
              status: 'ready',
              candidates: s.candidates.filter(
                (c) => c.row.id !== candidate.row.id,
              ),
            }
          : s,
      );
    };
    if (!result.ok) {
      if (result.reason === 'gone') {
        // Nothing to say: from here it is the same as having swiped them.
        drop();
        return;
      }
      setError(
        result.reason === 'no-aspect' ? t.discover.noAspect : t.errors.generic,
      );
      return;
    }
    drop();
    if (result.matchId)
      router.navigate({
        pathname: '/match/[id]',
        params: { id: result.matchId },
      });
  };

  const current = state.status === 'ready' ? state.candidates[0] : undefined;
  // Id of the card whose detail is open; a new card is therefore collapsed.
  const [detailFor, setDetailFor] = useState<string | null>(null);
  // Engine-rendered detail for the visible card; the screen only lays it out.
  const detail = useMemo(
    () =>
      me && current ? synastryReading(me.chart, current.row.chart, 3) : null,
    [me, current],
  );
  const showDetail = current !== undefined && detailFor === current.row.id;

  return (
    <View style={styles.screen} testID="discover-screen">
      <View style={styles.nav}>
        <Link href="/chart" style={styles.navLink}>
          {t.discover.myChart}
        </Link>
        <Text style={styles.title}>{t.discover.title}</Text>
        <View style={styles.navRight}>
          <Link href="/matches" style={styles.navLink} testID="go-matches">
            {t.discover.matches}
          </Link>
          <Link href="/settings" style={styles.navLink}>
            {t.discover.settings}
          </Link>
        </View>
      </View>

      {state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color="#9a94b8" />
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{t.errors.generic}</Text>
          <Pressable
            onPress={() => {
              setState({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            <Text style={styles.link}>{t.common.retry}</Text>
          </Pressable>
        </View>
      ) : !current ? (
        <View style={styles.center}>
          <Text style={styles.muted} testID="discover-empty">
            {t.discover.empty}
          </Text>
        </View>
      ) : (
        <View style={styles.card} testID={`card-${current.row.id}`}>
          <View style={styles.cardHead}>
            <Text style={styles.name}>
              {current.row.display_name}, {current.row.age}
            </Text>
            <Text style={styles.distance}>
              {current.row.distance_km === 0
                ? t.discover.under1km
                : `${current.row.distance_km} km`}
            </Text>
          </View>
          <View style={styles.row}>
            <Chip
              label={t.chart.sun}
              value={SIGN_TR[current.row.big_three.sun]}
            />
            <Chip
              label={t.chart.moon}
              value={SIGN_TR[current.row.big_three.moon]}
            />
            <Chip
              label={t.chart.rising}
              value={SIGN_TR[current.row.big_three.rising]}
            />
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.score} testID="score">
              {current.match.score}
            </Text>
            <Text style={styles.scoreLabel}>{t.discover.scoreLabel}</Text>
          </View>
          <Text style={styles.why} testID="why">
            {current.why ?? t.discover.noAspectWhy}
          </Text>
          <Pressable
            testID="toggle-detail"
            onPress={() =>
              setDetailFor(showDetail ? null : (current.row.id ?? null))
            }
          >
            <Text style={styles.link}>
              {showDetail ? t.discover.hideDetail : t.discover.detail}
            </Text>
          </Pressable>
          {showDetail && detail ? (
            <View style={styles.detail} testID="detail">
              <Text style={styles.detailText}>{detail.bandText}</Text>
              <Text style={styles.detailLabel}>{t.discover.elements}</Text>
              <Text style={styles.detailMuted}>{detail.sunElements}</Text>
              <Text style={styles.detailMuted}>{detail.moonElements}</Text>
              {detail.aspects.map((a) => (
                <View
                  key={`${a.aspect.planetA}-${a.aspect.aspect}-${a.aspect.planetB}`}
                  style={styles.detailAspect}
                >
                  <Text style={styles.detailLabel}>{a.headline}</Text>
                  <Text style={styles.detailText}>{a.meaning}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              testID="pass"
              style={[styles.button, styles.pass, busy && styles.buttonBusy]}
              disabled={busy}
              onPress={() => void act(current, 'pass')}
            >
              <Text style={styles.buttonText}>{t.discover.pass}</Text>
            </Pressable>
            <Pressable
              testID="like"
              style={[styles.button, styles.like, busy && styles.buttonBusy]}
              disabled={busy}
              onPress={() => void act(current, 'like')}
            >
              <Text style={styles.buttonText}>{t.discover.like}</Text>
            </Pressable>
          </View>
          <Text style={styles.remaining}>
            {t.discover.remaining(state.candidates.length - 1)}
          </Text>
        </View>
      )}
    </View>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0b1a', padding: 24, paddingTop: 64 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navLink: { color: '#9a94b8', fontSize: 14, padding: 4 },
  navRight: { flexDirection: 'row', gap: 8 },
  title: { color: '#f5f2ff', fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: '#9a94b8', textAlign: 'center' },
  link: { color: '#c9c4e3', padding: 12 },
  card: { backgroundColor: '#15142a', borderRadius: 20, padding: 20, gap: 14 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: { color: '#f5f2ff', fontSize: 24, fontWeight: '700' },
  distance: { color: '#9a94b8', fontSize: 14 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: '#1c1b33',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  chipLabel: { color: '#9a94b8', fontSize: 11 },
  chipValue: {
    color: '#f5f2ff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreBox: { alignItems: 'center', paddingVertical: 8 },
  score: { color: '#f5f2ff', fontSize: 56, fontWeight: '800' },
  scoreLabel: {
    color: '#9a94b8',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  why: { color: '#c9c4e3', fontSize: 15, textAlign: 'center' },
  error: { color: '#ff7b7b', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  pass: { backgroundColor: '#2a2945' },
  like: { backgroundColor: '#7c6cff' },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  remaining: { color: '#5f5a7a', fontSize: 12, textAlign: 'center' },
  detail: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#2a2945',
    paddingTop: 10,
  },
  detailLabel: { color: '#9a94b8', fontSize: 12, letterSpacing: 0.5 },
  detailText: { color: '#d9d5ef', fontSize: 14, lineHeight: 20 },
  detailMuted: { color: '#9a94b8', fontSize: 13, lineHeight: 19 },
  detailAspect: { gap: 2, marginTop: 4 },
});
