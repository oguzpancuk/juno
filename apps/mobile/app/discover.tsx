import {
  BANDS,
  SIGN_TR,
  bandName,
  bandOf,
  synastryReading,
  type Band,
} from '@juno/astro';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import { usePhotoSources } from '@/lib/photos';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, gradient, radius, space, type } from '@/theme/tokens';

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
          const next = await fetchCandidates(profile.profile.chart, {
            minBand: profile.profile.min_band,
            sunElements: profile.profile.sun_elements,
          });
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
  // Only the visible card's photo, and only while it is visible. Every
  // request is authorised by the endpoint (ADR-0006), so fetching the
  // whole deck up front would cost one invocation per candidate on every
  // swipe and buffer every image at once.
  const cardPath = current?.row.photos[0];
  const cardPaths = useMemo(
    () => (cardPath === undefined ? [] : [cardPath]),
    [cardPath],
  );
  const [cardSource] = usePhotoSources(cardPaths);
  // Id of the card whose detail is open; a new card is therefore collapsed.
  const [detailFor, setDetailFor] = useState<string | null>(null);
  // Engine-rendered detail for the visible card; the screen only lays it out.
  const detail = useMemo(
    () =>
      me && current ? synastryReading(me.chart, current.row.chart, 3) : null,
    [me, current],
  );
  const showDetail = current !== undefined && detailFor === current.row.id;
  // The card is content-height now, so iOS clamps the old offset to the new
  // maximum rather than returning to the top: without this the next
  // candidate opens part-way down, on their compatibility rather than their
  // face.
  const scroller = useRef<ScrollView>(null);
  const currentId = current?.row.id;
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [currentId]);

  return (
    <ScrollView
      ref={scroller}
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      testID="discover-screen"
    >
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
          <ActivityIndicator color={color.textMuted} />
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
          <View style={styles.photoWrap}>
            {(() => {
              const source = cardSource;
              return source ? (
                <Image
                  source={source}
                  style={styles.cardPhoto}
                  resizeMode="cover"
                  testID="card-photo"
                />
              ) : (
                <View style={[styles.cardPhoto, styles.cardPhotoEmpty]} />
              );
            })()}
            {/* The name sits on the photo, as in the design; the chart
                below it is what the card is actually about. */}
            <LinearGradient
              colors={['transparent', color.scrim, color.bg]}
              style={styles.photoScrim}
            >
              <Text style={styles.name}>
                {current.row.display_name}, {current.row.age}
              </Text>
              <Text style={styles.distance}>
                {current.row.distance_km === 0
                  ? t.discover.under1km
                  : `${current.row.distance_km} km`}
              </Text>
            </LinearGradient>
          </View>
          {current.row.bio ? (
            <Text style={styles.bio} numberOfLines={3}>
              {current.row.bio}
            </Text>
          ) : null}
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
          <View style={styles.bandBox}>
            <BandMeter band={bandOf(current.match.score)} />
            <View>
              <Text style={styles.bandName} testID="band">
                {bandName(current.match.score)}
              </Text>
              <Text style={styles.scoreLabel}>{t.discover.scoreLabel}</Text>
            </View>
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
              {detail.dimensions.length === 0 ? null : (
                <Text style={styles.detailLabel}>{t.discover.dimensions}</Text>
              )}
              <View style={styles.dimensionRow}>
                {detail.dimensions.map((d) => (
                  <View
                    key={d.dimension}
                    style={styles.dimensionChip}
                    testID={`dimension-${d.dimension}`}
                  >
                    <Text style={styles.dimensionName}>{d.name}</Text>
                    <Text style={styles.dimensionLabel}>{d.label}</Text>
                  </View>
                ))}
              </View>
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
              accessibilityLabel={t.discover.pass}
              style={[styles.round, busy && styles.buttonBusy]}
              disabled={busy}
              onPress={() => void act(current, 'pass')}
            >
              <Text style={styles.roundGlyph}>✕</Text>
            </Pressable>
            <Pressable
              testID="like"
              accessibilityLabel={t.discover.like}
              style={[styles.roundLike, busy && styles.buttonBusy]}
              disabled={busy}
              onPress={() => void act(current, 'like')}
            >
              <LinearGradient
                colors={[...gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.roundFill}
              >
                <Text style={styles.roundGlyphOn}>♥</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <Text style={styles.remaining}>
            {t.discover.remaining(state.candidates.length - 1)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Four steps, not a number. It keeps cards comparable at a glance without
 * asserting a precision the method does not have (ADR-0009 §3). The order
 * comes from the engine's own BANDS, so a reorder there cannot silently
 * fill the wrong number of bars here.
 */
function BandMeter({ band }: { band: Band }) {
  const filled = BANDS.indexOf(band) + 1;
  return (
    <View style={styles.meter} testID={`band-meter-${band}`}>
      {BANDS.map((step, i) => (
        <View
          key={step}
          style={[
            styles.meterStep,
            { height: 10 + i * 5 },
            i < filled && styles.meterStepOn,
          ]}
        />
      ))}
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
  screen: { flex: 1, backgroundColor: color.bg },
  scrollContent: {
    padding: space.lg,
    paddingTop: 64,
    paddingBottom: 48,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: color.bg,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  navLink: { ...type.bodySmall, color: color.textMuted, flexShrink: 1 },
  title: { ...type.heading, color: color.text },
  navRight: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  nudge: { ...type.bodySmall, color: color.cool, paddingBottom: space.sm },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.sm,
  },
  // The photo is what needs clipping, for the card's top corners — not the
  // card, which has to be free to grow past the viewport and scroll.
  photoWrap: {
    marginHorizontal: -space.lg,
    marginTop: -space.lg,
    marginBottom: space.xs,
    // The card has a 1pt border, so its padding box is one point tighter.
    borderTopLeftRadius: radius.xl - 1,
    borderTopRightRadius: radius.xl - 1,
    overflow: 'hidden',
  },
  cardPhoto: { width: '100%', height: 380 },
  cardPhotoEmpty: { backgroundColor: color.surfaceHigh },
  photoScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    paddingBottom: space.sm,
    gap: 2,
  },
  name: { ...type.title, color: color.text },
  distance: { ...type.bodySmall, color: color.textMuted },
  bio: { ...type.bodySmall, color: color.textMuted },
  row: { flexDirection: 'row', gap: space.sm },
  chip: {
    flex: 1,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.sm,
    alignItems: 'center',
    gap: 1,
  },
  chipLabel: { ...type.caption, color: color.textFaint },
  chipValue: { ...type.bodySmall, color: color.text, fontWeight: '600' },
  bandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  bandName: { ...type.title, color: color.text },
  scoreLabel: { ...type.label, color: color.textFaint },
  meter: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  meterStep: {
    width: 7,
    borderRadius: 3,
    backgroundColor: color.track,
  },
  meterStepOn: { backgroundColor: color.pink },
  why: { ...type.body, color: color.textMuted, textAlign: 'center' },
  link: {
    ...type.bodySmall,
    color: color.textMuted,
    textAlign: 'center',
    paddingVertical: space.sm,
  },
  detail: {
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  detailLabel: { ...type.label, color: color.textFaint, marginTop: space.sm },
  detailText: { ...type.bodySmall, color: color.text },
  detailMuted: { ...type.bodySmall, color: color.textMuted },
  detailAspect: { gap: 2, marginTop: space.sm },
  dimensionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  dimensionChip: {
    backgroundColor: color.surfaceHigh,
    borderRadius: radius.sm,
    paddingVertical: 5,
    paddingHorizontal: space.sm,
  },
  dimensionName: { ...type.caption, color: color.textFaint, fontSize: 11 },
  dimensionLabel: { ...type.caption, color: color.text },
  error: { ...type.bodySmall, color: color.danger, textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    gap: space.xl,
    justifyContent: 'center',
    marginTop: space.sm,
  },
  round: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundLike: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  roundFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  roundGlyph: { fontSize: 22, color: color.textMuted },
  roundGlyphOn: { fontSize: 24, color: color.onBright },
  buttonBusy: { opacity: 0.5 },
  remaining: { ...type.caption, color: color.textFaint, textAlign: 'center' },
  muted: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
