import { bandName, bandOf, natalReading } from '@juno/astro';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type PanResponderInstance,
} from 'react-native';
import {
  candidateOf,
  fetchCandidates,
  swipe,
  type Candidate,
  type DiscoverRow,
  type DiscoverState,
  type SwipeResult,
} from '@/lib/discover';
import { LinearGradient } from 'expo-linear-gradient';
import { BigThreeRow } from '@/components/BigThreeRow';
import { PairReading } from '@/components/PairReading';
import { BandRing } from '@/components/BandRing';
import { CosmicGround } from '@/components/CosmicGround';
import { FiltersPanel, filterWritesAnswered } from '@/components/FiltersPanel';
import { LikedMePanel } from '@/components/LikedMePanel';
import { Popup } from '@/components/Popup';
import { PremiumPanel } from '@/components/PremiumPanel';
import { SlidersIcon } from '@/components/SlidersIcon';
import { PHOTO_SCREEN_FRACTION, SCREEN_PADDING } from '@/components/ui';
import { ProfileView } from '@/components/ProfileView';
import { useScreenName } from '@/lib/a11y';
import { usePhotoSources } from '@/lib/photos';
import { firstSightOf } from '@/lib/matches';
import { INTO_MATCHES, matchArrivedHref } from '@/lib/routes';
import {
  fetchAllowance,
  fetchLikedMeCount,
  NO_ALLOWANCE,
  type Admirer,
  type Allowance,
} from '@/lib/premium';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import {
  CLAIM_DISTANCE,
  claimsCard,
  CROSS_FOLLOW,
  deckOffset,
  decideSwipe,
  SUPER_THRESHOLD,
  SWIPE_THRESHOLD,
} from '@/lib/swipe';
import {
  color,
  font,
  glass,
  gradient,
  radius,
  space,
  type,
} from '@/theme/tokens';

/** How far away someone is, as the card and the person sheet write it. */
function distanceLine(km: number): string {
  return km === 0 ? t.discover.under1km : `${km} km`;
}
/** The filters chip, the same size as the profile's settings chip. */
const CORNER_CHIP = 36;

/**
 * A ceiling on Dynamic Type below the photo. The card has to fit one
 * screen with nothing to scroll into (owner, 2026-09-14), so text that
 * grew without limit would eat the picture instead of running off the
 * bottom. 1.35 is the top of iOS's standard range; the accessibility
 * sizes are served uncapped by the two sheets, which do scroll.
 */
const MAX_DECK_SCALE = 1.35;

/** ✕, ★ and ♥ — the three answers, all the same target (owner,
 * 2026-09-23: "superlike butonu da ayni boyutta olsun"). The star was
 * smaller when it was the rare move offered quietly; it is now one of
 * the three things a card can be answered with, and an upward swipe
 * does it too. */
const ROUND_SIZE = 88;
/** The least each of the three gaps under the chips may shrink to. */
const SPACING_FLOOR = space.sm;
/**
 * The band used to sit between the chart chips and the buttons, and this
 * made the three gaps around it read equal. It is on the photograph now
 * (owner, 2026-09-23), so only the footer's share is left.
 */
const BAR_GAP_EXTRA = 5;

/** The two sheets a card can open; only ever one at a time. */
type Sheet = 'detail' | 'person';
/**
 * Why the membership sheet is open: a quota the server refused, or the
 * star pressed without the membership. The filters sheet's own locked
 * order is not here — it opens the membership inside itself, because two
 * `Popup`s are two native `Modal`s and iOS presents one at a time.
 */
type Upsell = 'daily' | 'super-spent' | 'super-premium';

/** What the sheet says above the membership panel. */
function upsellLine(why: Upsell): string {
  if (why === 'daily') return t.premium.lockedLikes;
  if (why === 'super-spent') return t.premium.lockedSuperSpent;
  return t.premium.lockedSuper;
}
/** The card's tilt at one full width of travel. */
const MAX_TILT_DEG = 12;
const FLY_OUT_MS = 220;
// react-native-web has no native driver and warns once per app run.
const NATIVE_DRIVER = Platform.OS !== 'web';

export default function Discover() {
  useScreenName(t.tabs.discover);
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
  // Discovery filters, as a popup from the deck's top-right corner (owner,
  // 2026-09-15). Closing it reloads the deck: nothing else would, because
  // the screen never lost focus.
  const [showFilters, setShowFilters] = useState(false);
  // Premium, as the deck meets it: what is left of the quotas, how many
  // people are waiting on the "seni beğenenler" list, and the two sheets
  // those open. `upsell` is what the membership is being offered for —
  // a spent quota or a star a free member pressed — and it is what the
  // sheet says above the panel.
  const [allowance, setAllowance] = useState<Allowance>(NO_ALLOWANCE);
  const [admirers, setAdmirers] = useState(0);
  const [showLiked, setShowLiked] = useState(false);
  const [upsell, setUpsell] = useState<Upsell | null>(null);
  // Somebody tapped on the "seni beğenenler" list: the deck goes to them
  // (owner, 2026-09-23: "listesinde birine tiklandiginda kesfet
  // sayfasinda ona gidilsin"). A ref, because what does the moving is the
  // load below — the list may have answered somebody while it was open,
  // and a deck reordered without a reload could still hold them. Whoever
  // is not in the deck at all — someone who liked this member from
  // outside their filters — becomes a card anyway, made from the row the
  // list already has (owner, 2026-09-23: "kesfet filtresinde olmasa da
  // ... burada bir ayrim olmasin"). They chose this member; the filters
  // decide who is offered, not who may be answered.
  const pinned = useRef<Admirer | null>(null);
  const { width, height } = useWindowDimensions();

  // Own profile first (for the chart), then the candidates scored against it.
  // State is set from promise callbacks, never synchronously in the effect.

  // On focus, not on mount: settings can change the radius or the stored
  // location while this screen stays mounted behind it, and the candidate
  // list is computed from both.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      // Taken out here rather than where it is used, because this load is
      // the one it was set for: every other way out of the promise below
      // (cancelled, an error, a rejection) would otherwise leave it in the
      // ref for an unrelated load to act on (review, 2026-09-23).
      const wanted = pinned.current;
      pinned.current = null;
      // After any filter write still in flight: closing the filters sheet
      // reloads the deck at once, and it must load with what was just set.
      filterWritesAnswered()
        .then(() => fetchOwnProfile(userId))
        .then(async (profile) => {
          const nothing = {
            me: null,
            allowance: NO_ALLOWANCE,
            admirers: 0,
          };
          if (profile.status === 'missing')
            return { status: 'missing' as const, ...nothing };
          if (profile.status !== 'ready')
            return { status: 'error' as const, ...nothing };
          const [next, left, waiting] = await Promise.all([
            fetchCandidates(profile.profile.chart, {
              minBand: profile.profile.min_band,
              sunElements: profile.profile.sun_elements,
              sortBy: profile.profile.sort_by,
            }),
            fetchAllowance(profile.profile.id, profile.profile.is_premium),
            fetchLikedMeCount(),
          ]);
          return {
            ...next,
            me: profile.profile,
            allowance: left,
            admirers: waiting,
          };
        })
        .then((result) => {
          if (cancelled) return;
          if (result.status === 'missing') {
            router.replace('/onboarding');
            return;
          }
          setMe(result.me);
          setAllowance(result.allowance);
          setAdmirers(result.admirers);
          // 'loading' never arrives here — `fetchCandidates` answers
          // ready or error — and a spinner would be the wrong end state
          // for it anyway.
          if (result.status !== 'ready') {
            setState({ status: 'error' });
            return;
          }
          setState({
            status: 'ready',
            candidates:
              wanted === null
                ? result.candidates
                : bringToFront(
                    result.candidates,
                    candidateOf(result.me.chart, cardOf(wanted)),
                  ),
          });
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
    async (
      candidate: Candidate,
      kind: 'like' | 'pass',
      isSuper = false,
    ): Promise<boolean> => {
      if (!me || busy) return false;
      // Asked here rather than sent and refused: the counter is this
      // device's and can be stale, but when it says zero the server has
      // just said so too, and a round trip to be told again is one the
      // person waits through. A swipe reaches this the same way the ♥
      // does, which is why the guard is not on the button.
      if (kind === 'like' && !isSuper && allowance.likesLeft === 0) {
        setUpsell('daily');
        return false;
      }
      // The star's own gates, here rather than on the button: a swipe up
      // is the same move and has to meet the same two answers.
      if (isSuper && !me.is_premium) {
        setUpsell('super-premium');
        return false;
      }
      if (isSuper && allowance.superLeft === 0) {
        setUpsell('super-spent');
        return false;
      }
      setBusy(true);
      setError(null);
      const result = await swipe(
        { id: me.id, chart: me.chart },
        { id: candidate.row.id, chart: candidate.row.chart },
        kind,
        isSuper,
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
        // A spent quota is not an error: the card stays where it is and
        // the membership sheet opens saying which one ran out. The
        // counter goes to zero with it — the server has just told us
        // what this device's count could only estimate.
        if (result.reason !== 'no-aspect' && result.reason !== 'db') {
          if (result.reason === 'daily') {
            setAllowance((left) => ({ ...left, likesLeft: 0 }));
          }
          if (result.reason === 'super-spent') {
            setAllowance((left) => ({ ...left, superLeft: 0 }));
          }
          setUpsell(result.reason);
          return false;
        }
        setError(
          result.reason === 'no-aspect'
            ? t.discover.noAspect
            : t.errors.generic,
        );
        return false;
      }
      // What the like cost. Counted here rather than re-read: the deck
      // reloads on focus anyway, and a round trip per swipe to learn a
      // number we already know is one the person waits for.
      if (kind === 'like') {
        setAllowance((left) => ({
          likesLeft:
            left.likesLeft === null ? null : Math.max(0, left.likesLeft - 1),
          superLeft: isSuper ? Math.max(0, left.superLeft - 1) : left.superLeft,
        }));
      }
      drop();
      if (result.matchId && firstSightOf(result.matchId))
        router.navigate(matchArrivedHref(result.matchId), INTO_MATCHES);
      return true;
    },
    [me, busy, allowance.likesLeft, allowance.superLeft],
  );

  const current = state.status === 'ready' ? state.candidates[0] : undefined;
  // Only the visible card's photo, and only while it is visible. Every
  // request is authorised by the endpoint (ADR-0006), so fetching the
  // whole deck up front would cost one invocation per candidate on every
  // swipe and buffer every image at once.
  // Which sheet is open, and over which card. Keyed by id rather than a
  // boolean so a card arriving underneath closes it: a sheet belongs to
  // the person it was opened on, never to the position.
  const [sheet, setSheet] = useState<{ id: string; of: Sheet } | null>(null);
  // Where the finger went down on the photo. The card claims only a
  // sideways drag, so an upward or downward one that stays on the photo is
  // still this press when it lifts — and a drag is not a tap.
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const open = current !== undefined && sheet?.id === current.row.id;
  const showDetail = open && sheet?.of === 'detail';
  const showPerson = open && sheet?.of === 'person';

  // Only the visible card's photo, and only while it is visible. Every
  // request is authorised by the endpoint (ADR-0006), so fetching the
  // whole deck up front would cost one invocation per candidate on every
  // swipe and buffer every image at once. The profile sheet needs the
  // rest of them, so the list widens while it is open and collapses when
  // it closes — `sourcesFor` matches a source to its own path, never to a
  // position, so the card's own image does not blank while the siblings
  // arrive.
  const cardPath = current?.row.photos[0];
  const allPaths = current?.row.photos;
  const cardPaths = useMemo(
    () =>
      showPerson && allPaths !== undefined
        ? [...allPaths]
        : cardPath === undefined
          ? []
          : [cardPath],
    [showPerson, allPaths, cardPath],
  );
  const sources = usePhotoSources(cardPaths);
  const cardSource = sources[0];
  // The two charts the detail sheet reads; `PairReading` does the rest, and
  // only once the sheet mounts it.
  const detail = useMemo(
    () =>
      me && current ? { mine: me.chart, theirs: current.row.chart } : null,
    [me, current],
  );
  // Their own chart, for the profile sheet. Memoised on the card like the
  // synastry above, so the sheet opens on a reading that is already there.
  const theirReading = useMemo(
    () => (current ? natalReading(current.row.chart) : null),
    [current],
  );
  // Where the card is under the finger. State, not a ref: it is read during
  // render for the interpolations below (see Calculating.tsx), and the
  // initialiser is lazy so the value is created once.
  const insets = useSafeAreaInsets();
  // The profile's settings chip sits at this height in the same corner, so
  // moving between the two tabs the control does not jump. The stamps start
  // below it: the pass stamp shares the right-hand corner.
  const cornerTop = Math.max(insets.top, space.xl);
  const stampTop = cornerTop + CORNER_CHIP + space.md;
  const [pan] = useState(() => new Animated.ValueXY());
  // The gesture itself, which the stamps are drawn from. Separate from
  // `pan` because `pan` is blended near the star's line to keep the
  // picture continuous, and a stamp drawn from the blend reads 63% on a
  // release that counts (review, 2026-09-23). `stampStrength` is the
  // same rule in one testable place; the interpolations below are its
  // animated form, so that they can run on the UI thread.
  const [gesture] = useState(() => new Animated.ValueXY());
  // 1 while the finger is making the star's gesture, 0 otherwise, set by
  // the same predicate that decides it. The SÜPER stamp is drawn through
  // this, so it cannot appear on a gesture that will send something else
  // — which it did, at full opacity, on a drag that passed (QA,
  // 2026-09-23).
  const [upward] = useState(() => new Animated.Value(0));
  const settle = useCallback(() => {
    upward.setValue(0);
    // Both, in step: the card comes home and the stamps fade with it.
    Animated.parallel(
      [pan, gesture].map((value) =>
        Animated.spring(value, {
          toValue: { x: 0, y: 0 },
          friction: 7,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ),
    ).start();
  }, [gesture, pan, upward]);
  // Memoised on exactly what the handlers close over: a new responder
  // starts with an empty gesture state, so one made on every render would
  // snap the card back to the middle when the photo arrived mid-drag. Not
  // a ref read from the handlers: the lint rule refuses a ref handed to a
  // function called during render.
  const responder = useMemo(
    () =>
      createDeckResponder({
        pan,
        gesture,
        upward,
        width,
        height,
        current,
        idle: !busy && !flying,
        act,
        settle,
        setFlying,
      }),
    [act, busy, current, flying, gesture, height, pan, settle, upward, width],
  );
  const threshold = width * SWIPE_THRESHOLD;
  const tilt = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [`-${MAX_TILT_DEG}deg`, '0deg', `${MAX_TILT_DEG}deg`],
    extrapolate: 'clamp',
  });
  // Each stamp is fully there exactly where a release would count, and
  // none of them is ever fully there for a verdict a release would send
  // instead: `stampStrength` in `lib/swipe.ts` is that rule, swept
  // against `decideSwipe` over the whole gesture space by its tests.
  // These three are the same arithmetic as animated nodes, reading the
  // gesture — not `pan`, which is blended.
  //
  // A star's gesture draws no sideways stamp at all, which is what the
  // `sideways` gate carries, for the same reason `decideSwipe` never
  // hands an upward gesture to its sideways arms.
  const sideways = Animated.subtract(1, upward);
  const likeOpacity = Animated.multiply(
    sideways,
    gesture.x.interpolate({
      inputRange: [0, threshold],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
  );
  const passOpacity = Animated.multiply(
    sideways,
    gesture.x.interpolate({
      inputRange: [-threshold, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  );
  // The star's own, on the other axis and upwards only.
  const superOpacity = Animated.multiply(
    upward,
    gesture.y.interpolate({
      inputRange: [-height * SUPER_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  );

  const currentId = current?.row.id;
  // From the middle, whatever the last card's gesture left behind.
  // Before paint: a passive effect would show the successor one frame
  // out where the last card flew to.
  useLayoutEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    gesture.setValue({ x: 0, y: 0 });
  }, [currentId, gesture, pan]);

  // After every hook, like its siblings. The deck was the one signed-in
  // screen with no guard: `if (!userId) return` in the load effect leaves
  // it on its spinner for ever, so a session expiring while someone is on
  // the deck used to end there.
  if (session.status === 'signed-out') return <RedirectToSignIn />;

  return (
    // No scrolling at all (owner, 2026-09-14: "kart scrollanabilir bir
    // birim olmasin"): one screen, the photo taking whatever the block
    // below it leaves.
    <View style={styles.screen} testID="discover-screen">
      <CosmicGround planet={false} horizon={false} />
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
        <>
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
            {/* The photo is both surfaces now (owner, 2026-09-14, reversing
              2026-09-11): a tap anywhere on it opens the person, a drag
              swipes. They do not fight — the card's responder claims only
              on horizontal movement, and taking the touch cancels this
              press before it can fire. A vertical drag is not claimed, so
              the press itself refuses a finger that travelled (review,
              2026-09-15). */}
            <View
              style={[
                styles.photoWrap,
                { height: Math.round(height * PHOTO_SCREEN_FRACTION) },
              ]}
            >
              {/* The photo's own button fills it, rather than containing
                everything drawn on it. A Pressable is one accessibility
                element and hides what is inside it, which took the band's
                button and the ring's reading away from VoiceOver when the
                band moved onto the photograph (review, 2026-09-23). As a
                sibling the band is its own element again, and it still
                takes the touch in its corner because it is drawn after. */}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPressIn={(event) => {
                  pressedAt.current = {
                    x: event.nativeEvent.pageX,
                    y: event.nativeEvent.pageY,
                  };
                }}
                onPress={(event) => {
                  const from = pressedAt.current;
                  pressedAt.current = null;
                  // A screen reader's activation carries no travel: NaN is
                  // not past the line, so it still opens.
                  if (
                    from !== null &&
                    Math.hypot(
                      event.nativeEvent.pageX - from.x,
                      event.nativeEvent.pageY - from.y,
                    ) > CLAIM_DISTANCE
                  )
                    return;
                  setSheet({ id: current.row.id, of: 'person' });
                }}
                accessibilityRole="button"
                // The name, age and distance drawn on the photo, which the
                // label would otherwise hide from VoiceOver (review, 2026-09-15).
                accessibilityLabel={t.discover.openPerson(
                  current.row.display_name,
                  current.row.age,
                  distanceLine(current.row.distance_km),
                )}
                testID="open-person"
              >
                {cardSource ? (
                  <Image
                    source={cardSource}
                    style={styles.cardPhoto}
                    resizeMode="cover"
                    testID="card-photo"
                  />
                ) : null}
                {/* The name sits on the photo, as in the design; the chart
                below it is what the card is actually about. */}
                <LinearGradient
                  colors={['transparent', color.scrim, color.bg]}
                  style={styles.photoScrim}
                >
                  {/* Over the name, inside the photograph, so it is the
                    first thing read about the person (owner, 2026-09-23,
                    choosing between three drafts). Its own Text rather
                    than part of the photo button's label, so VoiceOver
                    reads it in the order it is drawn — and the scrim is
                    paint, so nothing here takes a touch. */}
                  {current.row.likes_me ? (
                    <View
                      style={[
                        styles.likedBanner,
                        current.row.likes_me === 'super' &&
                          styles.likedBannerSuper,
                      ]}
                      testID="likes-me"
                    >
                      <Text
                        style={styles.likedBannerText}
                        maxFontSizeMultiplier={MAX_DECK_SCALE}
                      >
                        {current.row.likes_me === 'super'
                          ? `★  ${t.discover.likedYouSuper}`
                          : `♥  ${t.discover.likedYou}`}
                      </Text>
                    </View>
                  ) : null}
                  <Text
                    style={styles.name}
                    maxFontSizeMultiplier={MAX_DECK_SCALE}
                  >
                    {current.row.display_name}, {current.row.age}
                  </Text>
                  <Text
                    style={styles.distance}
                    maxFontSizeMultiplier={MAX_DECK_SCALE}
                  >
                    {distanceLine(current.row.distance_km)}
                  </Text>
                </LinearGradient>
              </Pressable>
              {/* The band on the photo's bottom corner, opposite the name
                (owner, 2026-09-23: "uyum gostergesi fotografin sag
                altina gitsin"). Drawn after the photo's button and over
                it, so the tap that opens the reading is not the tap that
                opens the person. */}
              <Pressable
                style={({ pressed }) => [styles.bandBox, pressed && styles.dim]}
                onPress={() => setSheet({ id: current.row.id, of: 'detail' })}
                accessibilityRole="button"
                accessibilityLabel={t.discover.openDetail(
                  bandName(current.match.score),
                )}
                hitSlop={space.sm}
                testID="open-detail"
              >
                <BandRing
                  band={bandOf(current.match.score)}
                  label={`${bandName(current.match.score)} ${t.discover.scoreLabel}`}
                  size={52}
                  stroke={5}
                />
                <Text
                  style={styles.bandName}
                  testID="band"
                  maxFontSizeMultiplier={MAX_DECK_SCALE}
                >
                  {bandName(current.match.score)}
                </Text>
              </Pressable>
              {/* The verdict as it forms, for sighted eyes only: the round
                buttons below are the accessible way to the same thing. */}
              <Animated.View
                style={[
                  styles.stamp,
                  styles.stampLike,
                  { top: stampTop, opacity: likeOpacity },
                ]}
                accessible={false}
                aria-hidden
                testID="stamp-like"
              >
                <Text style={[styles.stampText, styles.stampTextLike]}>
                  {t.discover.swipeLike}
                </Text>
              </Animated.View>
              <Animated.View
                style={[
                  styles.stamp,
                  styles.stampPass,
                  { top: stampTop, opacity: passOpacity },
                ]}
                accessible={false}
                aria-hidden
                testID="stamp-pass"
              >
                <Text style={[styles.stampText, styles.stampTextPass]}>
                  {t.discover.swipePass}
                </Text>
              </Animated.View>
            </View>
            <View style={styles.info}>
              <BigThreeRow
                three={current.row.big_three}
                maxFontSizeMultiplier={MAX_DECK_SCALE}
              />
              {/* Their own words, two lines of them, in a box of their
                own (owner, 2026-09-23: "bioyu bir kutucuk icine alip
                ui'i guzellestirelim"). The full text is on the person
                page a tap away. */}
              {current.row.bio ? (
                <View style={styles.bioBox}>
                  <Text
                    style={styles.bio}
                    numberOfLines={2}
                    maxFontSizeMultiplier={MAX_DECK_SCALE}
                    testID="card-bio"
                  >
                    {current.row.bio}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
          {/* The third stamp, and the only one that is not on the card.
            The other two ride it because a card going sideways travels
            past them; this gesture lifts the card, and a stamp on it
            went off the top of the screen — then, pushed down to answer
            that, out through the bottom of the photograph, which is
            clipped (QA, 2026-09-23, twice over). Here it is a thing on
            the screen: no parent to clip it and no lift to undo. */}
          <Animated.View
            style={[
              styles.stamp,
              styles.stampSuper,
              { top: stampTop, opacity: superOpacity },
            ]}
            accessible={false}
            aria-hidden
            testID="stamp-super"
          >
            <Text style={[styles.stampText, styles.stampTextSuper]}>
              {t.discover.swipeSuper}
            </Text>
          </Animated.View>
        </>
      )}
      {current ? (
        // Outside the card on purpose: at screen height, buttons tilting
        // and flying away with the picture read as a bug, and a pill that
        // has drifted under the finger turns a press into a swipe.
        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {/* No count of what is left (owner, 2026-09-23: "kac begeni
              kaldigi gozukmesin, sadece bitince engel olunsun"). The
              allowance is still read — `act` uses it to open the
              membership instead of spending a round trip on a like the
              server would refuse — it is simply not drawn. */}
          <View style={styles.actions}>
            <Pressable
              testID="pass"
              accessibilityLabel={t.discover.pass}
              style={[styles.round, (busy || flying) && styles.buttonBusy]}
              disabled={busy || flying}
              onPress={() => void act(current, 'pass')}
            >
              <Text
                style={styles.roundGlyph}
                maxFontSizeMultiplier={MAX_DECK_SCALE}
              >
                ✕
              </Text>
            </Pressable>
            {/* The star sits between the two verdicts, the same size as
                either (owner, 2026-09-23). A free member may press it —
                the sheet it opens is the offer, and `act` is what
                decides that, so the button and the upward swipe answer
                alike. */}
            <Pressable
              testID="super-like"
              accessibilityLabel={t.discover.superLike}
              style={[styles.roundSuper, (busy || flying) && styles.buttonBusy]}
              disabled={busy || flying}
              onPress={() => void act(current, 'like', true)}
            >
              <Text
                style={styles.roundGlyphSuper}
                maxFontSizeMultiplier={MAX_DECK_SCALE}
              >
                ★
              </Text>
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
                <Text
                  style={styles.roundGlyphOn}
                  maxFontSizeMultiplier={MAX_DECK_SCALE}
                >
                  ♥
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      ) : null}
      {current && detail ? (
        <Popup
          visible={showDetail}
          onClose={() => setSheet(null)}
          title={t.discover.detail}
          testID="detail"
        >
          {/* The match page's whole reading, not a digest of it (owner,
              2026-09-15). */}
          <PairReading mine={detail.mine} theirs={detail.theirs} />
        </Popup>
      ) : null}
      {current && theirReading ? (
        <Popup
          visible={showPerson}
          onClose={() => setSheet(null)}
          bleed
          testID="person-popup"
        >
          <ProfileView
            name={current.row.display_name}
            age={current.row.age}
            caption={distanceLine(current.row.distance_km)}
            photos={current.row.photos}
            sources={sources}
            three={current.row.big_three}
            bio={current.row.bio}
            reading={theirReading}
            chart={current.row.chart}
            fullChartLabel={t.person.fullChart}
            fullChartTitle={t.person.chartTitle(current.row.display_name)}
          />
        </Popup>
      ) : null}
      {/* Over everything else on the screen, and outside the card so it does
          not fly away with a swipe. Present in every state — loading, empty,
          error — because widening the filters is the way out of an empty
          deck. */}
      <Pressable
        testID="open-filters"
        accessibilityRole="button"
        accessibilityLabel={t.filters.title}
        hitSlop={12}
        onPress={() => setShowFilters(true)}
        style={({ pressed }) => [
          styles.filtersButton,
          { top: cornerTop },
          pressed && styles.dim,
        ]}
      >
        <SlidersIcon />
      </Pressable>
      <Popup
        visible={showFilters}
        onClose={() => {
          setShowFilters(false);
          setAttempt((n) => n + 1);
        }}
        title={t.filters.title}
        testID="filters-popup"
      >
        <FiltersPanel />
      </Popup>
      {/* The other corner: who is waiting for an answer. Drawn once the
          profile is in and in every state after that — an empty deck is
          exactly when this list is worth opening — and not before, because
          the sheet it opens needs that profile to score anybody. A chip
          that is there while it cannot answer is a chip that does nothing
          when pressed, or pops its sheet open by itself a second later
          (review, 2026-09-21). */}
      {me ? (
        <>
          <Pressable
            testID="open-liked-me"
            accessibilityRole="button"
            accessibilityLabel={
              admirers > 0 ? t.likedMe.openCount(admirers) : t.likedMe.open
            }
            hitSlop={12}
            onPress={() => setShowLiked(true)}
            style={({ pressed }) => [
              styles.likedButton,
              { top: cornerTop },
              pressed && styles.dim,
            ]}
          >
            <Text style={styles.likedGlyph}>♥</Text>
            {admirers > 0 ? (
              <View style={styles.likedBadge} testID="liked-me-badge">
                <Text style={styles.likedBadgeText} maxFontSizeMultiplier={1}>
                  {admirers > 99 ? '99+' : admirers}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Popup
            visible={showLiked}
            onClose={() => {
              setShowLiked(false);
              setAttempt((n) => n + 1);
            }}
            title={t.likedMe.title}
            testID="liked-me-popup"
          >
            <LikedMePanel
              me={me}
              onAnswered={() => setAdmirers((n) => Math.max(0, n - 1))}
              onOpen={(person) => {
                pinned.current = person;
                setShowLiked(false);
                setSheet(null);
                setState({ status: 'loading' });
                setAttempt((n) => n + 1);
              }}
            />
          </Popup>
        </>
      ) : null}
      {/* The membership, opened by whatever it was needed for. Closing it
          reloads the deck: a membership bought in here changes the order
          the cards come in, and puts the counter away. */}
      <Popup
        visible={upsell !== null}
        onClose={() => {
          setUpsell(null);
          setAttempt((n) => n + 1);
        }}
        title={t.premium.title}
        testID="premium-popup"
      >
        <View style={styles.upsell}>
          {upsell ? (
            <Text style={styles.upsellLine} testID="upsell-line">
              {upsellLine(upsell)}
            </Text>
          ) : null}
          <PremiumPanel />
        </View>
      </Popup>
    </View>
  );
}

/**
 * The deck with one person on top. Somebody the deck did not fetch — a
 * liker outside this member's filters — is put there as the card the
 * caller made of them, so tapping a name on "Seni beğenenler" always
 * lands on a card and never on a different kind of screen (owner,
 * 2026-09-23: "burada bir ayrim olmasin").
 */
function bringToFront(
  candidates: readonly Candidate[],
  wanted: Candidate,
): readonly Candidate[] {
  const found = candidates.find(
    (candidate) => candidate.row.id === wanted.row.id,
  );
  if (found === undefined) return [wanted, ...candidates];
  return [found, ...candidates.filter((candidate) => candidate !== found)];
}

/**
 * The card's row for somebody read off "Seni beğenenler". Every column a
 * card draws is on the `liked_me` row already — the distance included,
 * which is why it is on the view.
 */
function cardOf(person: Admirer): DiscoverRow {
  return {
    id: person.id,
    display_name: person.display_name,
    age: person.age,
    gender: person.gender,
    big_three: person.big_three,
    chart: person.chart,
    distance_km: person.distance_km,
    bio: person.bio,
    photos: [...person.photos],
    // Being on that list is what they did: this person chose this member.
    // Only a premium member can open the list at all, which is the same
    // condition the view puts on `discover.likes_me`.
    likes_me: person.is_super ? 'super' : 'like',
  };
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
  gesture,
  upward,
  width,
  height,
  current,
  idle,
  act,
  settle,
  setFlying,
}: {
  pan: Animated.ValueXY;
  /** The gesture itself, which the stamps read; see the stamps above. */
  gesture: Animated.ValueXY;
  /** 1 while the gesture is the star's; see the stamp above. */
  upward: Animated.Value;
  width: number;
  height: number;
  current: Candidate | undefined;
  /** No record in flight and no card flying: a release may decide. */
  idle: boolean;
  act: (
    candidate: Candidate,
    kind: 'like' | 'pass',
    isSuper?: boolean,
  ) => Promise<boolean>;
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
    // Only a clearly horizontal move claims the card. There is no scroll
    // view on this surface any more (owner, 2026-09-14), so nothing else
    // wants a vertical drag — but a deliberate vertical flick must still
    // not read as a verdict.
    // Upwards is the star, and it claims the same way on the other axis
    // (owner, 2026-09-23). Downwards is still nobody's: nothing is bound
    // to it, and it stays unclaimed so the card does not follow a finger
    // that means nothing by it. Claiming is deliberately looser than
    // `isUpwardGesture`: a finger between the two lines holds the card
    // and is drawn sideways, which is what its release will send. A
    // claim as strict as the star would leave that finger holding
    // nothing at all.
    onMoveShouldSetPanResponder: (_, g) => claimsCard(g.dx, g.dy),
    onPanResponderGrant: () => {
      grantedId = current?.row.id;
      upward.setValue(0);
    },
    // Refuses the JS-side request. The ancestor scroll view that used to
    // take the touch back on a steep diagonal is gone with the card's
    // rewrite, so the diagonal measurements in NOTES 2026-09-11 describe
    // a mechanism this surface no longer has; the refusal stays as the
    // general safety net, because a Modal opening under a live finger
    // still terminates.
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      // One call, and `deckOffset` is what `decideSwipe` reads the
      // gesture with too: the picture and the verdict cannot be two
      // rules that drift apart, which is what they were.
      const drawn = deckOffset(g.dx, g.dy);
      upward.setValue(drawn.up ? 1 : 0);
      pan.setValue({ x: drawn.x, y: drawn.y });
      // The stamps read this one. `pan` is blended near the star's line
      // and would under-draw a stamp on a release that counts.
      gesture.setValue({ x: g.dx, y: g.dy });
    },
    onPanResponderRelease: (_, g) => {
      // Not idle: a record is in flight for this very card. No decision,
      // and the round buttons are inert for the same reason.
      if (!idle || current === undefined || grantedId !== current.row.id) {
        settle();
        return;
      }
      const decision = decideSwipe({
        dx: g.dx,
        vx: g.vx,
        dy: g.dy,
        vy: g.vy,
        width,
        height,
      });
      if (decision === null) {
        settle();
        return;
      }
      setFlying(true);
      // The verdict is made and the card is leaving, so the stamps are
      // pinned to what is being sent: the one that counts rides out with
      // the card and the other two go. Left on the finger's own last
      // numbers, a star flung away to the left would draw PASS on its
      // way out.
      upward.setValue(decision === 'super' ? 1 : 0);
      gesture.setValue(
        decision === 'super'
          ? { x: 0, y: -height }
          : { x: (decision === 'like' ? 1 : -1) * width, y: 0 },
      );
      Animated.timing(pan, {
        toValue:
          decision === 'super'
            ? { x: g.dx * CROSS_FOLLOW, y: -height * 1.5 }
            : {
                x: (decision === 'like' ? 1 : -1) * width * 1.5,
                y: g.dy * CROSS_FOLLOW,
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
        // A star that the membership or the week's quota refuses comes
        // back exactly as a failed like does: `act` answers false, and
        // the card settles with the membership sheet open over it.
        void act(
          current,
          decision === 'super' ? 'like' : decision,
          decision === 'super',
        ).then(
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
    // The platform took the touch away — a sheet opening over the card,
    // a call arriving: no decision, the card goes home.
    onPanResponderTerminate: settle,
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: color.bg,
  },
  // The swipeable unit: the picture and the chart block under it. No
  // border and no radius — at screen height a hairline sweeping across the
  // display under the tilt reads as a fault, not as an edge.
  //
  // It hugs its content and the footer takes what is left, so ✕ / ♥ sit in
  // the middle of the free space rather than against the tab bar (owner,
  // 2026-09-14). Both card and photo may shrink: on a screen too short for
  // the full photo share it is the picture that gives way, never the
  // buttons, which keep the footer's minimum height.
  card: { flexGrow: 1, flexShrink: 1 },
  photoWrap: {
    // `PHOTO_SCREEN_FRACTION` is the height it asks for; growing is what
    // it does with whatever the block below leaves over. Fixed at the
    // fraction, that leftover piled up between the bio and the round
    // buttons — 51 points of it at 390x844 — which is what the owner saw
    // (2026-09-23: "hala cok bosluk var"). The photograph is the only
    // thing on this screen that can spend space without looking padded.
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: color.surfaceHigh,
  },
  cardPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // The big three, then the band. `space-between` puts the free space the
  // card was given between the two, so the band floats down to meet the
  // buttons' spacing instead of sticking to the chips.
  info: {
    paddingHorizontal: SCREEN_PADDING,
    // `Screen`'s own gap between children, so the big three sit the same
    // distance below the photo here as they do on the profile.
    paddingTop: space.lg,
    gap: space.md,
  },
  // Equal gaps around the buttons — the words to the buttons, the buttons
  // to the tab bar (owner, 2026-09-15: "uyum ile alt ve üstteki mesafeler
  // aynı mı?"). Every share of the free space is the footer's, and
  // `space-evenly` splits it above and below the row. It used to be split
  // with the card, which spent its share between the chips and the band —
  // but the band moved onto the photograph on 2026-09-23 and nothing was
  // left down here to spend it on, so the share became a hole between the
  // words and the buttons (owner: "bio ve butonlar arasindaki bosluk cok
  // fazla"). No bottom inset: the tab bar under this screen already covers
  // the home indicator (lib/insets.ts).
  footer: {
    flexGrow: 0,
    minHeight: ROUND_SIZE + 2 * SPACING_FLOOR,
    justifyContent: 'space-evenly',
    paddingTop: SPACING_FLOOR,
    paddingBottom: SPACING_FLOOR + BAR_GAP_EXTRA,
    paddingHorizontal: SCREEN_PADDING,
  },
  dim: { opacity: 0.6 },
  // The same 36pt chip as the profile's settings control, in the same
  // corner, so the two read as one kind of thing.
  filtersButton: {
    position: 'absolute',
    right: SCREEN_PADDING,
    width: CORNER_CHIP,
    height: CORNER_CHIP,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // SCREEN_PADDING, not a literal: this block has to land on the same
    // x as the profile's, which gets it from `Screen` (owner, 2026-09-14:
    // the two cards must look exactly the same).
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: space.xxl,
    paddingBottom: space.md,
    gap: 2,
    // Paint only. It overlaps the two corner buttons, and a gradient
    // with a name in it must not be what a finger lands on.
    pointerEvents: 'none',
  },
  name: { ...type.title, color: color.text },
  distance: { ...type.bodySmall, color: color.textMuted },
  // The words in a box, like the boxes the profile page is made of, so
  // the card's bottom half is two blocks rather than a row of chips and
  // then loose text (owner, 2026-09-23).
  // A badge, not a button: it says what has already happened. The pill
  // shape and the hairline are the membership sheet's, so the one thing
  // on the card that only a premium member sees looks like the rest of
  // what the membership draws.
  likedBanner: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.pink,
    backgroundColor: glass.sheet,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginBottom: space.xs,
  },
  likedBannerSuper: { borderColor: color.warm },
  likedBannerText: { ...type.caption, color: color.text },
  // The sheet's own card, as every other box in the app is drawn
  // (owner, 2026-09-23: "diğer kutucuklar gibi yarısaydam yap"): the
  // translucent fill and the hairline edge, at the card radius.
  bioBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.edge,
    backgroundColor: glass.fill,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  bio: { ...type.body, color: color.text },
  // A stamp on the photo's upper corner, on the side the card is heading
  // away from — where the eye is, with the finger on the other side.
  stamp: {
    position: 'absolute',
    // The finger is on the photo; the stamps are a picture of it.
    pointerEvents: 'none',
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
  // Upright and in the middle: the gesture it belongs to has no side.
  stampSuper: { alignSelf: 'center', borderColor: color.warm },
  stampText: { ...type.heading, letterSpacing: 2 },
  stampTextLike: { color: color.pink },
  stampTextPass: { color: color.textMuted },
  stampTextSuper: { color: color.warm },
  // On the photograph now, in the corner opposite the name, sitting on
  // the same bottom line as it. The ring and the word stack, because
  // side by side they would reach halfway across the picture.
  bandBox: {
    position: 'absolute',
    right: SCREEN_PADDING,
    bottom: space.md,
    alignItems: 'center',
    gap: 2,
  },
  bandName: { ...type.label, color: color.text, textAlign: 'center' },
  link: {
    ...type.bodySmall,
    color: color.textMuted,
    textAlign: 'center',
    paddingVertical: space.sm,
  },
  error: { ...type.bodySmall, color: color.danger, textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    gap: space.xl,
    justifyContent: 'center',
  },
  round: {
    width: ROUND_SIZE,
    height: ROUND_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundLike: {
    width: ROUND_SIZE,
    height: ROUND_SIZE,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  roundFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // The same circle as ✕, in the star's own colour.
  roundSuper: {
    width: ROUND_SIZE,
    height: ROUND_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.warm,
    backgroundColor: color.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  roundGlyph: { fontSize: 32, color: color.textMuted },
  roundGlyphOn: { fontSize: 35, color: color.onBright },
  roundGlyphSuper: { fontSize: 32, color: color.warm },
  // The filters chip's twin, in the other corner.
  likedButton: {
    position: 'absolute',
    left: SCREEN_PADDING,
    width: CORNER_CHIP,
    height: CORNER_CHIP,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedGlyph: { fontSize: 18, color: color.warm },
  // The matches tab's badge, in the same colours, on the chip's corner.
  likedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    backgroundColor: color.cool,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedBadgeText: {
    ...type.caption,
    fontSize: 11,
    color: color.onBright,
    fontFamily: font.semibold,
  },
  upsell: { gap: space.lg },
  upsellLine: { ...type.body, color: color.text },
  buttonBusy: { opacity: 0.5 },
  muted: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
