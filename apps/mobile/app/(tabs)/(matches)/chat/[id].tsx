import { natalReading } from '@juno/astro';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { z } from 'zod';
import { Avatar } from '@/components/Avatar';
import { MatchDetail } from '@/components/MatchDetail';
import { Popup } from '@/components/Popup';
import { ProfileView } from '@/components/ProfileView';
import { BackChevron, BackLink, goBack } from '@/components/ui';
import {
  VISIBLE_PAGES,
  indicatorPage,
  pageOffset,
  pagerSettle,
  type Page,
} from '@/lib/chat-pages';
import { useTopClearance } from '@/lib/insets';
import { useKeyboardGap } from '@/lib/keyboard';
import {
  MAX_MESSAGE_LENGTH,
  isSendable,
  markThreadRead,
  useThread,
  type MessageRow,
} from '@/lib/chat';
import { fetchMatch, type MatchProfileRow } from '@/lib/matches';
import { usePhotoSources } from '@/lib/photos';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { starterFor } from '@/lib/starter';
import { CosmicGround } from '@/components/CosmicGround';
import { t } from '@/lib/strings';
import {
  excerpt,
  indexById,
  lastReadMine,
  quoteFor,
  showsAvatar,
} from '@/lib/thread-view';
import { color, font, glass, radius, space, type } from '@/theme/tokens';

/** The `page` param: anything but "match" opens the thread. */
const PageParam = z.enum(VISIBLE_PAGES).catch('thread');

/** Stable identity while the row is still loading. */
const EMPTY: readonly string[] = [];

/**
 * One conversation as two pages — the thread and the match detail — under
 * a two-segment header, swiped or tapped between (owner, 2026-09-11).
 * The header carries the way back to the list and, on the name itself,
 * the way into their profile (owner, 2026-09-12).
 *
 * Keyed by the match id: everything below belongs to one conversation.
 * The starter screen pops back to a thread with POP_TO, which finds a
 * `chat/[id]` route by name and overwrites its params while keeping its
 * key — so with a thread to someone else already on the stack, this
 * component would re-render for a different match holding the first
 * one's half-typed message, and the next tap on Gönder would send it to
 * the wrong person. The same key discards an open block confirmation on
 * page 2 when a match arriving over Realtime swaps the id.
 */
/**
 * How long the pager has to be still before it counts as settled. Long
 * enough not to fire between two scroll events of one gesture, short
 * enough that leaving through the empty page still feels immediate.
 */
const PAGER_QUIET_MS = 120;

export default function ChatScreen() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>();
  return (
    <ChatView
      key={typeof id === 'string' ? id : 'none'}
      id={id}
      page={PageParam.parse(page)}
    />
  );
}

function ChatView({
  id,
  page,
}: {
  id: string | string[] | undefined;
  page: Page;
}) {
  const matchId = typeof id === 'string' ? id : null;
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [row, setRow] = useState<MatchProfileRow | null | 'loading'>('loading');
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const [failed, setFailed] = useState(false);
  const { messages, send, loadOlder } = useThread(matchId, userId);
  // Portrait only (app.json), so the page width does not change under a
  // mounted pager.
  const { width } = useWindowDimensions();
  const keyboardGap = useKeyboardGap();

  useEffect(() => {
    if (!matchId || !userId) return;
    let cancelled = false;
    void fetchMatch(matchId).then((r) => {
      if (!cancelled) setRow(r);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId, userId]);

  // Photos come from an endpoint that authorises every request
  // (ADR-0006), so they are fetched per visit and never cached. One call
  // for the header avatar, the bubbles and page 2's strip.
  const photos = row !== 'loading' && row ? row.photos : EMPTY;
  const sources = usePhotoSources(photos);
  const avatar = sources[0] ?? null;

  // Read receipts only while the thread is on screen: the Realtime
  // subscription keeps running when the user navigates away.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (matchId && userId) void markThreadRead(matchId, userId);
      return () => {
        focused.current = false;
      };
    }, [matchId, userId]),
  );
  useEffect(() => {
    if (!focused.current || !matchId || !userId) return;
    if (messages === 'loading' || messages === null) return;
    if (messages.some((m) => m.sender_id !== userId && m.read_at === null)) {
      void markThreadRead(matchId, userId);
    }
  }, [messages, matchId, userId]);

  // Their page, opened from the header rather than from a link at the
  // foot of Uyum (owner, 2026-09-12). The row the chat already holds
  // carries everything the page needs, so opening it fetches nothing.
  const [showPerson, setShowPerson] = useState(false);
  const theirReading = useMemo(
    () => (row !== 'loading' && row ? natalReading(row.chart) : null),
    [row],
  );

  const list = useMemo(
    () => (messages === 'loading' || messages === null ? [] : messages),
    [messages],
  );
  // Newest first: the list is inverted so the thread grows upward.
  const ordered = useMemo(() => [...list].reverse(), [list]);
  const byId = useMemo(() => indexById(list), [list]);
  const readId = useMemo(
    () => (userId ? lastReadMine(list, userId) : null),
    [list, userId],
  );

  // The pager. `active` is what the segments show; the ScrollView is the
  // truth and reports back on `onMomentumScrollEnd`. There are three
  // pages: an empty one in front of the thread that is the way out
  // (lib/chat-pages.ts), then the thread, then the match detail.
  const topPadding = useTopClearance(space.md);
  const pager = useRef<ScrollView>(null);
  /**
   * The last offset seen. A release needs one: react-native-web never
   * calls `onScrollEndDrag` — it routes that prop to an internal handler
   * and `forwardedProps` drops it — so `onTouchEnd` is the only thing that
   * knows the finger is up, and it carries no offset of its own. Without
   * it a slow drag onto the exit page and a lingering release left the
   * screen sitting on the blank page with nothing left to arm a settle.
   *
   * It starts as null, meaning no offset is known yet, and a release with
   * nothing known settles nothing. The first draft started it at zero —
   * which is the exit page's offset at every width — so the first plain
   * tap in the thread settled on the way out and popped the screen back to
   * the matches list 120 ms later. Touch events bubble, so a tap on a
   * message bubble or the composer is one (review, 2026-09-18).
   */
  const lastX = useRef<number | null>(null);
  const [active, setActive] = useState<Page>(page);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const applied = useRef<Page | null>(null);
  // One exit per screen: a fling that settles on the empty page fires
  // once, and a second settle event while the pop is in flight is ignored.
  const leaving = useRef(false);
  const goTo = (target: Page, animated: boolean) => {
    const x = pageOffset(target, width);
    // Kept in step with every programmatic move, so a release that lands
    // before any scroll event reads where the pager actually is.
    lastX.current = x;
    pager.current?.scrollTo({ x, y: 0, animated });
    setActive(target);
  };
  // The param is applied once the pager has a size — a scrollTo before
  // layout is dropped — and again when a navigate to this same chat swaps
  // it: a match arriving over Realtime while its thread is open.
  const onPagerLayout = (event: LayoutChangeEvent) => {
    setPageHeight(event.nativeEvent.layout.height);
    if (applied.current === page) return;
    applied.current = page;
    goTo(page, false);
  };
  useEffect(() => {
    if (pageHeight === null || applied.current === page) return;
    applied.current = page;
    lastX.current = pageOffset(page, width);
    pager.current?.scrollTo({
      x: lastX.current,
      animated: false,
    });
    setActive(page);
  }, [page, pageHeight, width]);
  /**
   * The pager stops moving.
   *
   * Reached two ways, because one of them does not happen everywhere:
   * `onMomentumScrollEnd` on a native fling, and a short quiet spell after
   * the last scroll event otherwise. The web has `pagingEnabled` as CSS
   * scroll-snap, which settles with no momentum phase and so fires no
   * momentum end at all — which is why a swipe onto Uyum left the
   * underline on Sohbet, and why a swipe onto the empty page never left
   * the screen (owner, 2026-09-18).
   */
  const pagerWidth = useRef(width);
  useEffect(() => {
    pagerWidth.current = width;
  }, [width]);
  // Whether a finger is on the glass. `pagerSettle` refuses to leave the
  // screen while it is, which is what separates a settle from a pause.
  const dragging = useRef(false);

  const settleAt = (x: number) => {
    const { active: next, exit } = pagerSettle({
      x,
      width: pagerWidth.current,
      dragging: dragging.current,
    });
    setActive(next);
    if (!exit || leaving.current) return;
    leaving.current = true;
    goBack('/matches');
  };
  const quiet = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopWaiting = () => {
    if (quiet.current !== null) clearTimeout(quiet.current);
    quiet.current = null;
  };
  const waitForQuiet = (x: number) => {
    stopWaiting();
    quiet.current = setTimeout(() => {
      quiet.current = null;
      settleAt(x);
    }, PAGER_QUIET_MS);
  };
  useEffect(() => stopWaiting, []);
  const onPageSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    stopWaiting();
    dragging.current = false;
    settleAt(event.nativeEvent.contentOffset.x);
  };
  const onDragStart = () => {
    dragging.current = true;
    stopWaiting();
  };
  const onDragEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    // The snap happens after the release, so this is the earliest a settle
    // may be considered — and the quiet spell is what waits for it.
    waitForQuiet(event.nativeEvent.contentOffset.x);
  };
  /**
   * The web's version of the above: a finger leaving, with no offset of
   * its own.
   *
   * Only when the last one leaves. React Native hands the prop every
   * ending touch, so a second finger lifting off a two-finger drag used to
   * open the guard while one was still on the glass — and a `touchcancel`,
   * which a browser sends when its compositor takes a touch over for
   * scrolling, latched it open for the rest of the gesture with nothing on
   * the web able to set it back: `onScrollBeginDrag` never fires there.
   * That put the peek-and-hold exit back within reach (review,
   * 2026-09-18), which is the one failure this guard exists for.
   */
  const onTouchRelease = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length > 0) return;
    dragging.current = false;
    if (lastX.current !== null) waitForQuiet(lastX.current);
  };
  /** A finger that is moving is a finger that is down. */
  const onTouchMove = () => {
    dragging.current = true;
  };
  const onPageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { x } = event.nativeEvent.contentOffset;
    lastX.current = x;
    // The underline follows the thumb rather than waiting for the release;
    // being briefly wrong here costs an underline, never a screen.
    setActive(indicatorPage(x, pagerWidth.current));
    // Armed while dragging too, because a slow drag can end without an
    // end-drag event on some renderers; `pagerSettle` is what makes that
    // harmless — with a finger down it can only move the underline.
    waitForQuiet(x);
  };

  // After every hook: hooks must run in the same order on each render.
  if (session.status === 'signed-out') return <RedirectToSignIn />;

  if (row === 'loading' || messages === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }
  if (!row || !userId || !matchId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t.errors.generic}</Text>
        <BackLink label={t.chat.backToMatches} fallback="/matches" />
      </View>
    );
  }

  const starter = starterFor(row, userId);
  const canSend = isSendable(draft) && !sending;

  const onSend = () => {
    // A ref, not the rendered `sending`: two taps in one frame both read
    // the old state and would post the message twice.
    if (!isSendable(draft) || inFlight.current) return;
    const body = draft;
    const quoting = replyTo;
    inFlight.current = true;
    setSending(true);
    setFailed(false);
    void send(body, quoting?.id).then((ok) => {
      inFlight.current = false;
      setSending(false);
      if (!ok) {
        setFailed(true);
        return;
      }
      // Keep whatever the user typed while the insert was in flight, and
      // the reply target if they picked another one meanwhile.
      setDraft((current) => (current === body ? '' : current));
      setReplyTo((current) => (current?.id === quoting?.id ? null : current));
    });
  };

  const pageStyle =
    pageHeight === null ? { width } : { width, height: pageHeight };

  return (
    <View style={styles.screen} testID="chat-screen">
      <CosmicGround planet={false} horizon={false} />
      <View
        style={[
          styles.header,
          // The inset plus a gutter, with no floor under it. The floor
          // used to be 44, which is a status bar's height — right on a
          // phone, where the app owns the screen, and 44 points of
          // nothing in a browser, which has already made that room. It
          // put this header a status bar too low (owner, 2026-09-18:
          // "geri butonu ve sümeyye başlığı da çok altta").
          { paddingTop: topPadding },
        ]}
      >
        {/* One row: the way out, then whose conversation this is (owner,
            2026-09-14 — "buton profil resminin solunda olsun"). */}
        <View style={styles.headerRow}>
          <BackChevron
            glyph={t.chat.backGlyph}
            accessibilityLabel={t.chat.backToMatchesLabel}
            fallback="/matches"
            testID="chat-back"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.person.openProfile(row.display_name)}
            onPress={() => setShowPerson(true)}
            style={({ pressed }) => [styles.titleRow, pressed && styles.dim]}
            testID="open-person"
          >
            <Avatar
              name={row.display_name}
              source={avatar}
              size={32}
              testID="chat-avatar"
            />
            <Text style={styles.title} numberOfLines={1}>
              {row.display_name}
            </Text>
          </Pressable>
        </View>
        <View style={styles.segments} accessibilityRole="tablist">
          {VISIBLE_PAGES.map((p) => {
            const on = active === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => goTo(p, true)}
                style={styles.segment}
                testID={`page-${p}`}
              >
                <Text
                  style={[styles.segmentLabel, on && styles.segmentLabelOn]}
                >
                  {p === 'thread' ? t.chat.tabThread : t.chat.tabMatch}
                </Text>
                <View style={[styles.underline, on && styles.underlineOn]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        // iOS reads this before the first frame, so a chat opened on its
        // Uyum page never shows the thread first, and neither page ever
        // opens showing the empty one; onLayout covers the rest.
        contentOffset={{ x: pageOffset(page, width), y: 0 }}
        onLayout={onPagerLayout}
        onMomentumScrollEnd={onPageSettled}
        onScroll={onPageScroll}
        onScrollBeginDrag={onDragStart}
        onScrollEndDrag={onDragEnd}
        // The web has no drag events of its own on a scroll view; these
        // are what tell it a finger is down.
        onTouchStart={onDragStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchRelease}
        // A browser sends this when its compositor takes the touch over.
        // It goes through the same release, which ignores it while any
        // finger is still down.
        onTouchCancel={onTouchRelease}
        // Often enough that the underline keeps up with the thumb, and
        // that the quiet spell below is measured from the real last event.
        scrollEventThrottle={16}
        // The send button is under this ScrollView too; without this a tap
        // on it with the keyboard up only dismisses the keyboard.
        keyboardShouldPersistTaps="handled"
        style={styles.pager}
        testID="chat-pager"
      >
        {/* Empty on purpose: swiping onto it is how the screen leaves. */}
        <View style={pageStyle} testID="chat-page-back" />

        <View style={pageStyle} testID="chat-page-thread">
          {/* The composer rides the keyboard: the gap is measured from
              the keyboard itself, because a KeyboardAvoidingView inside
              this pager measured its own frame against a scrolling
              container and left the composer underneath it (owner,
              2026-09-16). */}
          <View style={[styles.page, { paddingBottom: keyboardGap }]}>
            <FlatList
              inverted
              data={ordered}
              keyExtractor={(m) => m.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              testID="chat-messages"
              // Inverted: the end of the list is the top of the thread, so
              // this is "scrolled back far enough, fetch older messages".
              onEndReached={() => void loadOlder()}
              onEndReachedThreshold={0.4}
              renderItem={({ item, index }) => {
                const mine = item.sender_id === userId;
                const quoted =
                  item.reply_to === null ? null : quoteFor(byId, item.reply_to);
                return (
                  <View style={[styles.row, mine ? styles.rowMine : null]}>
                    {mine ? null : (
                      // The slot is always there so a run's bubbles line
                      // up; only its last bubble fills it.
                      <View style={styles.avatarSlot}>
                        {showsAvatar(ordered, index, userId) ? (
                          <Avatar
                            name={row.display_name}
                            source={avatar}
                            size={28}
                            testID="bubble-avatar"
                          />
                        ) : null}
                      </View>
                    )}
                    <View style={styles.bubbleColumn}>
                      <Pressable
                        onLongPress={() => setReplyTo(item)}
                        // VoiceOver users cannot long-press a bubble; the
                        // custom action offers the same reply.
                        accessibilityActions={[
                          { name: 'longpress', label: t.chat.reply },
                        ]}
                        onAccessibilityAction={(event) => {
                          if (event.nativeEvent.actionName === 'longpress')
                            setReplyTo(item);
                        }}
                        style={[
                          styles.bubble,
                          mine ? styles.mine : styles.theirs,
                        ]}
                        testID={mine ? 'message-mine' : 'message-theirs'}
                      >
                        {item.reply_to === null ? null : (
                          <View style={styles.quote} testID="quote">
                            {quoted ? (
                              <>
                                <Text style={styles.quoteWho}>
                                  {quoted.sender_id === userId
                                    ? t.chat.you
                                    : row.display_name}
                                </Text>
                                <Text
                                  style={styles.quoteText}
                                  numberOfLines={2}
                                >
                                  {excerpt(quoted.body)}
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.quoteText}>
                                {t.chat.replyUnavailable}
                              </Text>
                            )}
                          </View>
                        )}
                        <Text style={styles.bubbleText}>{item.body}</Text>
                      </Pressable>
                      {item.id === readId ? (
                        <Text style={styles.read} testID="read-receipt">
                          {t.chat.read}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              }}
              // The footer is the head of an inverted list, so this card
              // sits at the very start of the thread. Once anything has
              // been said it is in the way — and after sending the starter
              // from /starter it was the same sentence twice, one line apart.
              ListFooterComponent={
                // `messages === null` is a failed load, not an empty thread:
                // the card would be claiming the conversation has not
                // started when the app does not know that.
                ordered.length === 0 && messages !== null ? (
                  <View style={styles.starterBox} testID="chat-starter">
                    <Text style={styles.starterLabel}>
                      {t.match.starterLabel}
                    </Text>
                    <Text style={styles.starterQuestion}>
                      {starter?.question ?? t.match.noStarter}
                    </Text>
                    <Link
                      href={{
                        pathname: '/starter/[id]',
                        params: { id: matchId },
                      }}
                      style={styles.starterLink}
                    >
                      {t.starter.open}
                    </Link>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                messages === null ? (
                  <Text style={styles.muted}>{t.errors.generic}</Text>
                ) : null
              }
            />

            {failed ? (
              <Text style={styles.failed}>{t.chat.sendFailed}</Text>
            ) : null}
            {replyTo ? (
              <View style={styles.replyBar} testID="reply-bar">
                <View style={styles.replyBarText}>
                  <Text style={styles.replyBarLabel}>{t.chat.reply}</Text>
                  <Text style={styles.replyBarExcerpt} numberOfLines={1}>
                    {excerpt(replyTo.body)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setReplyTo(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t.chat.cancelReply}
                  hitSlop={12}
                  style={styles.replyCancel}
                  testID="reply-cancel"
                >
                  <Text style={styles.replyCancelGlyph}>✕</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={t.chat.placeholder}
                placeholderTextColor={color.textFaint}
                multiline
                maxLength={MAX_MESSAGE_LENGTH}
                testID="chat-input"
              />
              <Pressable
                onPress={onSend}
                disabled={!canSend}
                style={[
                  styles.sendButton,
                  canSend ? null : styles.sendDisabled,
                ]}
                testID="chat-send"
              >
                <Text
                  style={[
                    styles.sendLabel,
                    canSend ? null : styles.sendLabelDisabled,
                  ]}
                >
                  {t.chat.send}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={pageStyle} testID="chat-page-match">
          <MatchDetail row={row} userId={userId} sources={sources} />
        </View>
      </ScrollView>

      {theirReading === null ? null : (
        <Popup
          visible={showPerson}
          onClose={() => setShowPerson(false)}
          bleed
          testID="person-popup"
        >
          <ProfileView
            name={row.display_name}
            age={row.age}
            photos={row.photos}
            sources={sources}
            three={row.big_three}
            bio={row.bio}
            details={row}
            reading={theirReading}
            chart={row.chart}
            fullChartLabel={t.person.fullChart}
            fullChartTitle={t.person.chartTitle(row.display_name)}
          />
        </Popup>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: color.bg,
  },
  // `paddingTop` comes from the safe-area inset at the call site: the
  // back link is the topmost thing on the screen now, and a hardcoded
  // number puts its hit area under the Dynamic Island.
  header: {
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: space.md,
  },
  // `flexShrink` so a long name yields to the chevron rather than pushing
  // it off the row; the chevron's own box is a fixed 44pt tall.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    flexShrink: 1,
  },
  dim: { opacity: 0.6 },
  title: { ...type.title, color: color.text, flexShrink: 1 },
  segments: { flexDirection: 'row' },
  // 44pt targets; the underline is the last 2pt of each.
  segment: { flex: 1, minHeight: 44, justifyContent: 'flex-end' },
  segmentLabel: {
    ...type.heading,
    color: color.textMuted,
    textAlign: 'center',
    paddingBottom: space.sm,
  },
  segmentLabelOn: { color: color.text },
  underline: { height: 2, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: color.pink },
  pager: { flex: 1 },
  page: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  rowMine: { justifyContent: 'flex-end' },
  avatarSlot: { width: 28, height: 28 },
  bubbleColumn: { maxWidth: '82%', flexShrink: 1 },
  bubble: { borderRadius: 16, padding: 12, gap: space.sm },
  mine: { backgroundColor: color.mine },
  theirs: {
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.edge,
  },
  bubbleText: {
    fontFamily: font.regular,
    color: color.text,
    fontSize: 15,
    lineHeight: 21,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: color.borderStrong,
    paddingLeft: space.sm,
    gap: 2,
  },
  quoteWho: {
    ...type.caption,
    color: color.textMuted,
    fontFamily: font.semibold,
  },
  quoteText: { ...type.bodySmall, color: color.textMuted },
  read: {
    ...type.caption,
    color: color.textFaint,
    alignSelf: 'flex-end',
    paddingTop: space.xs,
    paddingRight: space.xs,
  },
  starterBox: {
    backgroundColor: glass.fill,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    marginBottom: 12,
  },
  starterLabel: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 11,
    letterSpacing: 1,
  },
  starterQuestion: {
    fontFamily: font.regular,
    color: color.text,
    fontSize: 17,
    lineHeight: 24,
  },
  starterLink: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 14,
    paddingTop: 10,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: 16,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderLeftWidth: 2,
    borderLeftColor: color.pink,
    backgroundColor: glass.fill,
    borderRadius: radius.sm,
  },
  replyBarText: { flex: 1, gap: 2 },
  replyBarLabel: {
    ...type.caption,
    color: color.pink,
    fontFamily: font.semibold,
  },
  replyBarExcerpt: { ...type.bodySmall, color: color.textMuted },
  replyCancel: { padding: space.xs },
  replyCancelGlyph: { color: color.textMuted, fontSize: 17 },
  // Sixteen on all four sides. The bottom used to add the safe-area
  // inset, which was right while this was a root route and became a
  // second helping when it moved under the tab bar (owner, 2026-09-14;
  // lib/insets.ts).
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  input: {
    fontFamily: font.regular,
    flex: 1,
    maxHeight: 120,
    backgroundColor: glass.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: color.text,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: color.cool,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendDisabled: { backgroundColor: color.disabled },
  sendLabel: { color: color.onBright, fontSize: 15, fontFamily: font.semibold },
  // The button's fill goes dark when it is disabled, which is how the
  // screen opens; the label has to follow it or it disappears. `textMuted`
  // rather than `textFaint`: 5.19:1 on this fill against 2.76:1, and this
  // branch put four other colours right for being under 3:1.
  sendLabelDisabled: { color: color.textMuted },
  failed: {
    fontFamily: font.regular,
    color: color.danger,
    fontSize: 13,
    paddingHorizontal: 16,
  },
  muted: {
    fontFamily: font.regular,
    color: color.textMuted,
    textAlign: 'center',
  },
});
