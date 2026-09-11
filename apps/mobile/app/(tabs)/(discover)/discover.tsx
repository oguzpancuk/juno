import { bandName, bandOf, synastryReading } from '@juno/astro';
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
import { BigThreeRow } from '@/components/BigThreeRow';
import { CompatibilityDetail } from '@/components/CompatibilityDetail';
import { BandMeter } from '@/components/Meter';
import { Popup } from '@/components/Popup';
import { usePhotoSources } from '@/lib/photos';
import { matchDetailHref, personHref } from '@/lib/routes';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { RedirectToSignIn, useSession } from '@/lib/session';
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
    if (result.matchId) router.navigate(matchDetailHref(result.matchId));
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

  // After every hook, like its siblings. The deck was the one signed-in
  // screen with no guard: `if (!userId) return` in the load effect leaves
  // it on its spinner for ever, so a session expiring while someone is on
  // the deck used to end there.
  if (session.status === 'signed-out') return <RedirectToSignIn />;

  return (
    <ScrollView
      ref={scroller}
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      testID="discover-screen"
    >
      <Text style={styles.title}>{t.discover.title}</Text>

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
          <Link href={personHref(current.row.id)} asChild>
            <Pressable style={styles.photoWrap} testID="open-person">
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
            </Pressable>
          </Link>
          {current.row.bio ? (
            <Text style={styles.bio} numberOfLines={3}>
              {current.row.bio}
            </Text>
          ) : null}
          <BigThreeRow three={current.row.big_three} />
          <View style={styles.bandBox}>
            <BandMeter
              band={bandOf(current.match.score)}
              label={bandName(current.match.score)}
            />
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
          {/* The detail is a popup, not a disclosure (owner, 2026-09-11):
              the card stays a glance, the reading is a sheet over it. */}
          <Pressable
            testID="open-detail"
            accessibilityRole="button"
            style={styles.detailButton}
            onPress={() => setDetailFor(current.row.id)}
          >
            <Text style={styles.detailButtonText}>{t.discover.detail}</Text>
          </Pressable>
          {detail ? (
            <Popup
              visible={showDetail}
              onClose={() => setDetailFor(null)}
              title={t.discover.detail}
              testID="detail"
            >
              <View style={styles.popupBand}>
                <BandMeter band={detail.band} label={detail.bandName} />
                <Text style={styles.bandName}>{detail.bandName}</Text>
              </View>
              <CompatibilityDetail reading={detail} />
            </Popup>
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
  title: { ...type.heading, color: color.text },
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
  bandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  bandName: { ...type.title, color: color.text },
  scoreLabel: { ...type.label, color: color.textFaint },
  why: { ...type.body, color: color.textMuted, textAlign: 'center' },
  link: {
    ...type.bodySmall,
    color: color.textMuted,
    textAlign: 'center',
    paddingVertical: space.sm,
  },
  detailButton: {
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    paddingVertical: space.md,
    alignItems: 'center',
    marginTop: space.xs,
  },
  detailButtonText: { ...type.body, color: color.text, fontWeight: '600' },
  popupBand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
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
