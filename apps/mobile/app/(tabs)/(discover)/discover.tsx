import { bandName, bandOf, synastryReading } from '@juno/astro';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type PanResponderInstance,
} from 'react-native';
import {
  fetchCandidates,
  swipe,
  type Candidate,
  type DiscoverState,
  type SwipeResult,
} from '@/lib/discover';
import { LinearGradient } from 'expo-linear-gradient';
import { BigThreeRow } from '@/components/BigThreeRow';
import { CompatibilityDetail } from '@/components/CompatibilityDetail';
import { BandMeter } from '@/components/Meter';
import { Popup } from '@/components/Popup';
import { usePhotoSources } from '@/lib/photos';
import { INTO_MATCHES, matchDetailHref, personHref } from '@/lib/routes';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { decideSwipe, SWIPE_THRESHOLD } from '@/lib/swipe';
import { color, gradient, radius, space, type } from '@/theme/tokens';

/**
 * Horizontal travel before the card, not the scroll, owns the touch. Under
 * it a finger is still deciding, and a tap on a button is well under it.
 */
const CLAIM_DISTANCE = 8;
/**
 * How much of a vertical drag the card follows: enough to feel held, not
 * enough to fight the scroll for the same movement.
 */
const DY_FOLLOW = 0.25;
/** The card's tilt at one full width of travel. */
const MAX_TILT_DEG = 12;
const FLY_OUT_MS = 220;
// react-native-web has no native driver and warns once per app run.
const NATIVE_DRIVER = Platform.OS !== 'web';

export default function Discover() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [me, setMe] = useState<OwnProfile | null>(null);
  const [state, setState] = useState<DiscoverState>({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A card on its way off the screen, before and during its record. The
  // round buttons are inert meanwhile: a tap on ♥ in those 220 ms would
  // start a second record of the same card through a closure that still
  // believes nothing is busy.
  const [flying, setFlying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { width } = useWindowDimensions();

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

  /**
   * Record the swipe and drop the card. Answers whether the card is gone,
   * so a gesture that flew it off the screen knows to bring it back when
   * the record failed and the card is still the one on top. Memoised
   * because the gesture responder below closes over it.
   */
  const act = useCallback(
    async (candidate: Candidate, kind: 'like' | 'pass'): Promise<boolean> => {
      if (!me || busy) return false;
      setBusy(true);
      setError(null);
      const result = await swipe(
        { id: me.id, chart: me.chart },
        { id: candidate.row.id, chart: candidate.row.chart },
        kind,
      ).catch(
        // A thrown network failure is the same as a refused write, and
        // must not leave `busy` set for the rest of the session.
        (): SwipeResult => ({ ok: false, reason: 'db' }),
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
          return true;
        }
        setError(
          result.reason === 'no-aspect'
            ? t.discover.noAspect
            : t.errors.generic,
        );
        return false;
      }
      drop();
      if (result.matchId)
        router.navigate(matchDetailHref(result.matchId), INTO_MATCHES);
      return true;
    },
    [me, busy],
  );

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

  // Where the card is under the finger. State, not a ref: it is read during
  // render for the interpolations below (see Calculating.tsx), and the
  // initialiser is lazy so the value is created once.
  const [pan] = useState(() => new Animated.ValueXY());
  const settle = useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [pan]);
  // Memoised on exactly what the handlers close over: a new responder
  // starts with an empty gesture state, so one made on every render would
  // snap the card back to the middle when the photo arrived mid-drag. Not
  // a ref read from the handlers: the lint rule refuses a ref handed to a
  // function called during render.
  const responder = useMemo(
    () =>
      createDeckResponder({
        pan,
        width,
        current,
        idle: !busy && !flying,
        act,
        settle,
        setFlying,
      }),
    [act, busy, current, flying, pan, settle, width],
  );
  const threshold = width * SWIPE_THRESHOLD;
  const tilt = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [`-${MAX_TILT_DEG}deg`, '0deg', `${MAX_TILT_DEG}deg`],
    extrapolate: 'clamp',
  });
  // Each stamp is fully there exactly where a release would count.
  const likeOpacity = pan.x.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = pan.x.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // The card is content-height now, so iOS clamps the old offset to the new
  // maximum rather than returning to the top: without this the next
  // candidate opens part-way down, on their compatibility rather than their
  // face.
  const scroller = useRef<ScrollView>(null);
  const currentId = current?.row.id;
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [currentId]);
  // And from the middle, whatever the last card's gesture left behind.
  // Before paint: a passive effect would show the successor one frame
  // out where the last card flew to.
  useLayoutEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [currentId, pan]);

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
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate: tilt },
              ],
            },
          ]}
          testID={`card-${current.row.id}`}
          {...responder.panHandlers}
        >
          {/* The photo is the swipe surface, not a tap target (owner,
              2026-09-11): "Profili gör" below is the way to the person. */}
          <View style={styles.photoWrap}>
            {cardSource ? (
              <Image
                source={cardSource}
                style={styles.cardPhoto}
                resizeMode="cover"
                testID="card-photo"
              />
            ) : (
              <View style={[styles.cardPhoto, styles.cardPhotoEmpty]} />
            )}
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
            {/* The verdict as it forms, for sighted eyes only: the round
                buttons below are the accessible way to the same thing. */}
            <Animated.View
              style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID="stamp-like"
            >
              <Text style={[styles.stampText, styles.stampTextLike]}>
                {t.discover.swipeLike}
              </Text>
            </Animated.View>
            <Animated.View
              style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID="stamp-pass"
            >
              <Text style={[styles.stampText, styles.stampTextPass]}>
                {t.discover.swipePass}
              </Text>
            </Animated.View>
          </View>
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
              the card stays a glance, the reading is a sheet over it. Beside
              it, the person at length. */}
          <View style={styles.pills}>
            <Pressable
              testID="open-detail"
              accessibilityRole="button"
              style={styles.pill}
              onPress={() => setDetailFor(current.row.id)}
            >
              <Text style={styles.pillText}>{t.discover.detail}</Text>
            </Pressable>
            <Pressable
              testID="open-person"
              accessibilityRole="button"
              style={styles.pill}
              // navigate, not push: a second tap before the transition
              // lands would otherwise stack the same person twice.
              onPress={() => router.navigate(personHref(current.row.id))}
            >
              <Text style={styles.pillText}>{t.discover.openProfile}</Text>
            </Pressable>
          </View>
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
              style={[styles.round, (busy || flying) && styles.buttonBusy]}
              disabled={busy || flying}
              onPress={() => void act(current, 'pass')}
            >
              <Text style={styles.roundGlyph}>✕</Text>
            </Pressable>
            <Pressable
              testID="like"
              accessibilityLabel={t.discover.like}
              style={[styles.roundLike, (busy || flying) && styles.buttonBusy]}
              disabled={busy || flying}
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
        </Animated.View>
      )}
    </ScrollView>
  );
}

/**
 * The deck's gesture, outside the component on purpose: it keeps one
 * mutable — the card it was granted on — and the compiler's lint rules
 * refuse a variable reassigned after render inside a component, rightly.
 * Everything else arrives as arguments from the render that made it, and
 * the memo above remakes it when any of them change.
 */
function createDeckResponder({
  pan,
  width,
  current,
  idle,
  act,
  settle,
  setFlying,
}: {
  pan: Animated.ValueXY;
  width: number;
  current: Candidate | undefined;
  /** No record in flight and no card flying: a release may decide. */
  idle: boolean;
  act: (candidate: Candidate, kind: 'like' | 'pass') => Promise<boolean>;
  settle: () => void;
  setFlying: (flying: boolean) => void;
}): PanResponderInstance {
  // The card this responder was granted on. The responder is remade when
  // a record returns (busy flips, the card drops) — which can happen with
  // a finger still down after a tap on ♥ — and the remade one would
  // otherwise take the rest of that drag as a swipe on the next
  // candidate, someone the person has not seen. Its own grant never ran,
  // so the ids differ and the release settles.
  let grantedId: string | undefined;
  return PanResponder.create({
    // Never on touch start: a tap has to reach the buttons underneath.
    // Only a clearly horizontal move claims the card, so a vertical drag
    // stays the scroll view's — the rule main checks on the simulator.
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > CLAIM_DISTANCE && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => {
      grantedId = current?.row.id;
    },
    // Refuses the JS-side request only. On iOS under the new
    // architecture the native scroll view can still cancel a content
    // touch once its own pan begins on a steep diagonal; that arrives as
    // a terminate below and settles the card — no decision, no write. A
    // 300 pt drag with 90 pt of vertical travel, and one of 200 pt with
    // 180 pt, both recorded fine on the simulator (NOTES 2026-09-11); if
    // testers report lost swipes,
    // `scrollEnabled={false}` on the scroll view for the length of a
    // drag is the no-dependency remedy.
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      pan.setValue({ x: g.dx, y: g.dy * DY_FOLLOW });
    },
    onPanResponderRelease: (_, g) => {
      // Not idle: a record is in flight for this very card. No decision,
      // and the round buttons are inert for the same reason.
      if (!idle || current === undefined || grantedId !== current.row.id) {
        settle();
        return;
      }
      const decision = decideSwipe({ dx: g.dx, vx: g.vx, width });
      if (decision === null) {
        settle();
        return;
      }
      setFlying(true);
      Animated.timing(pan, {
        toValue: {
          x: (decision === 'like' ? 1 : -1) * width * 1.5,
          y: g.dy * DY_FOLLOW,
        },
        duration: FLY_OUT_MS,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        // Caught mid-flight. The new touch remakes the responder (flying
        // is a dependency), and the remade one never had the grant, so
        // the catch only snaps the card home and settles — it cannot
        // decide. Rare, and the safe way round.
        if (!finished) {
          setFlying(false);
          return;
        }
        // A dropped card's successor starts from the middle (the layout
        // effect in the component); a card that could not be recorded is
        // still the one on top and comes home.
        void act(current, decision).then(
          (dropped) => {
            setFlying(false);
            if (!dropped) settle();
          },
          () => {
            setFlying(false);
            settle();
          },
        );
      });
    },
    // The platform took the touch away (iOS cancels content touches when
    // its scroll view starts moving): no decision, the card goes home.
    onPanResponderTerminate: settle,
  });
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
  // Edge to edge (owner, 2026-09-12): the card cancels the screen's
  // gutter so its photo touches both edges, and gives up the side border
  // and the corner radius that only made sense inset.
  card: {
    marginHorizontal: -space.lg,
    // The title needs air: with the card full width there is no inset
    // left to read as a gap.
    marginTop: space.sm,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.sm,
  },
  // The photo still needs its own clip: it is the child that overflows the
  // card's padding, and the card has to stay free to grow past the
  // viewport and scroll.
  photoWrap: {
    marginHorizontal: -space.lg,
    marginTop: -space.lg,
    marginBottom: space.xs,
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
  // A stamp on the photo's upper corner, on the side the card is heading
  // away from — where the eye is, with the finger on the other side.
  stamp: {
    position: 'absolute',
    // The finger is on the photo; the stamps are a picture of it.
    pointerEvents: 'none',
    top: space.xl,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderWidth: 2,
    borderRadius: radius.sm,
    backgroundColor: color.scrim,
  },
  stampLike: {
    left: space.xl,
    borderColor: color.pink,
    transform: [{ rotate: `-${MAX_TILT_DEG}deg` }],
  },
  stampPass: {
    right: space.xl,
    borderColor: color.textMuted,
    transform: [{ rotate: `${MAX_TILT_DEG}deg` }],
  },
  stampText: { ...type.heading, letterSpacing: 2 },
  stampTextLike: { color: color.pink },
  stampTextPass: { color: color.textMuted },
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
  pills: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  pill: {
    flex: 1,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  pillText: {
    ...type.body,
    color: color.text,
    fontWeight: '600',
    textAlign: 'center',
  },
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
