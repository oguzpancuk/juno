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
  fetchCandidates,
  swipe,
  type Candidate,
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
  SUPER_LIKES_PER_WEEK,
  type Allowance,
} from '@/lib/premium';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { decideSwipe, SWIPE_THRESHOLD } from '@/lib/swipe';
import { color, font, gradient, radius, space, type } from '@/theme/tokens';

/**
 * Horizontal travel before the card owns the touch. Under it a finger is
 * still deciding, and a tap on a button is well under it.
 */
const CLAIM_DISTANCE = 8;

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

/** ✕ and ♥ — the verdict, the largest targets on the screen. */
const ROUND_SIZE = 88;
/** ★ — the premium move, between them and deliberately smaller. */
const SUPER_SIZE = 56;
/** The least each of the three gaps under the chips may shrink to. */
const SPACING_FLOOR = space.sm;
/**
 * The band word's own line box is taller than its glyphs: measured on the
 * device, about 4.7pt of it is empty above the letters and 0.7pt below.
 * The layout gaps are equal, so the *drawn* gap above the band came out
 * ~5pt larger than the two below it. Lifting the band by 4 and giving the
 * bottom gap 5 more makes the three read equal to within half a point.
 */
const BAND_LIFT = 4;
const BAR_GAP_EXTRA = 5;

/** The two sheets a card can open; only ever one at a time. */
type Sheet = 'detail' | 'person';
/**
 * Why the membership sheet is open: a quota the server refused, or the
 * star pressed without the membership. `sort` is the filters sheet's,
 * passed through the same way.
 */
type Upsell = 'daily' | 'super-spent' | 'super-premium' | 'sort';

/** What the sheet says above the membership panel. */
function upsellLine(why: Upsell): string {
  if (why === 'daily') return t.premium.lockedLikes;
  if (why === 'super-spent') return t.premium.lockedSuperSpent;
  if (why === 'sort') return t.premium.lockedSort;
  return t.premium.lockedSuper;
}
/**
 * How much of a vertical drag the card follows: enough to feel held, not
 * so much that a wobble looks like an answer.
 */
const DY_FOLLOW = 0.25;
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
    [me, busy, allowance.likesLeft],
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

  const currentId = current?.row.id;
  // From the middle, whatever the last card's gesture left behind.
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
          <Pressable
            style={[
              styles.photoWrap,
              { height: Math.round(height * PHOTO_SCREEN_FRACTION) },
            ]}
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
              <Text style={styles.name} maxFontSizeMultiplier={MAX_DECK_SCALE}>
                {current.row.display_name}, {current.row.age}
              </Text>
              <Text
                style={styles.distance}
                maxFontSizeMultiplier={MAX_DECK_SCALE}
              >
                {distanceLine(current.row.distance_km)}
              </Text>
            </LinearGradient>
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
          </Pressable>
          <View style={styles.info}>
            <BigThreeRow
              three={current.row.big_three}
              maxFontSizeMultiplier={MAX_DECK_SCALE}
            />
            {/* Their own words, two lines of them, between the chart and
                the band (sheet frame 05). The full text is on the person
                page a tap away. */}
            {current.row.bio ? (
              <Text
                style={styles.bio}
                numberOfLines={2}
                maxFontSizeMultiplier={MAX_DECK_SCALE}
                testID="card-bio"
              >
                {current.row.bio}
              </Text>
            ) : null}
            {/* The reading opens from the thing it explains (owner,
                2026-09-14). */}
            <Pressable
              style={({ pressed }) => [styles.bandBox, pressed && styles.dim]}
              onPress={() => setSheet({ id: current.row.id, of: 'detail' })}
              accessibilityRole="button"
              // The band word drawn inside, then what a tap opens.
              accessibilityLabel={t.discover.openDetail(
                bandName(current.match.score),
              )}
              hitSlop={space.md}
              testID="open-detail"
            >
              <BandRing
                band={bandOf(current.match.score)}
                label={`${bandName(current.match.score)} ${t.discover.scoreLabel}`}
                size={56}
                stroke={5}
              />
              <View>
                <Text
                  style={styles.bandName}
                  testID="band"
                  maxFontSizeMultiplier={MAX_DECK_SCALE}
                >
                  {bandName(current.match.score)}
                </Text>
                <Text
                  style={styles.scoreLabel}
                  maxFontSizeMultiplier={MAX_DECK_SCALE}
                >
                  {t.discover.scoreLabel}
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      )}
      {current ? (
        // Outside the card on purpose: at screen height, buttons tilting
        // and flying away with the picture read as a bug, and a pill that
        // has drifted under the finger turns a press into a swipe.
        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {/* What is left, for whoever has a limit: a free member's day
              of likes, a premium member's week of stars. Silent for a
              premium member who has all five. */}
          {allowanceLine(allowance) ? (
            <Text style={styles.allowance} testID="allowance">
              {allowanceLine(allowance)}
            </Text>
          ) : null}
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
            {/* The star sits between the two verdicts and is smaller than
                either: it is the rarer thing, not the louder one. A free
                member may press it — the sheet it opens is the offer. */}
            <Pressable
              testID="super-like"
              accessibilityLabel={t.discover.superLike}
              style={[styles.roundSuper, (busy || flying) && styles.buttonBusy]}
              disabled={busy || flying}
              onPress={() => {
                if (!me?.is_premium) {
                  setUpsell('super-premium');
                  return;
                }
                if (allowance.superLeft === 0) {
                  setUpsell('super-spent');
                  return;
                }
                void act(current, 'like', true);
              }}
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
        <FiltersPanel onPremium={() => setUpsell('sort')} />
      </Popup>
      {/* The other corner: who is waiting for an answer. Like the filters
          chip it is present in every state — an empty deck is exactly
          when this list is worth opening. */}
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
      {me ? (
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
          />
        </Popup>
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
 * The line under the deck, or none. A free member is counting likes; a
 * premium member is only told about the stars, and only once some are
 * gone — a full week of them is not news.
 */
function allowanceLine(allowance: Allowance): string | null {
  if (allowance.likesLeft !== null) {
    return allowance.likesLeft === 0
      ? t.discover.likesGone
      : t.discover.likesLeft(allowance.likesLeft);
  }
  if (allowance.superLeft < SUPER_LIKES_PER_WEEK) {
    return t.discover.superLeft(allowance.superLeft);
  }
  return null;
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
    // Only a clearly horizontal move claims the card. There is no scroll
    // view on this surface any more (owner, 2026-09-14), so nothing else
    // wants a vertical drag — but a deliberate vertical flick must still
    // not read as a verdict.
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > CLAIM_DISTANCE && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => {
      grantedId = current?.row.id;
    },
    // Refuses the JS-side request. The ancestor scroll view that used to
    // take the touch back on a steep diagonal is gone with the card's
    // rewrite, so the diagonal measurements in NOTES 2026-09-11 describe
    // a mechanism this surface no longer has; the refusal stays as the
    // general safety net, because a Modal opening under a live finger
    // still terminates.
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
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    // `Screen`'s own gap between children, so the big three sit the same
    // distance below the photo here as they do on the profile.
    paddingTop: space.md,
    gap: SPACING_FLOOR,
  },
  // Three equal gaps below the chips — chips to band, band to buttons,
  // buttons to the tab bar (owner, 2026-09-15: "uyum ile alt ve üstteki
  // mesafeler aynı mı?"). The free space splits by flex weight: one share
  // to the card, where `info` spends it between chips and band; two to the
  // footer, which spends them evenly above and below the buttons. Each
  // side also carries the same floor, so the three stay equal when the
  // free space runs out. No bottom inset: the tab bar under this screen
  // already covers the home indicator (lib/insets.ts).
  footer: {
    flexGrow: 2,
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
  stampText: { ...type.heading, letterSpacing: 2 },
  stampTextLike: { color: color.pink },
  stampTextPass: { color: color.textMuted },
  // No vertical padding: it would add to the gap on each side of the band
  // and break the equal spacing. The touch target keeps its reach through
  // `hitSlop` on the Pressable instead.
  bandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    marginBottom: BAND_LIFT,
  },
  bandName: { ...type.title, color: color.text },
  scoreLabel: { ...type.label, color: color.textFaint },
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
  // Smaller than ✕ and ♥ and centred between them: the star is the rare
  // move, offered without competing with the verdict.
  roundSuper: {
    width: SUPER_SIZE,
    height: SUPER_SIZE,
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
  roundGlyphSuper: { fontSize: 24, color: color.warm },
  // Above the three buttons, in the footer's even spacing.
  allowance: {
    ...type.bodySmall,
    color: color.textFaint,
    textAlign: 'center',
  },
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
