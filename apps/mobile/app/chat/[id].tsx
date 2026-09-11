import {
  Link,
  Redirect,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MAX_MESSAGE_LENGTH,
  isSendable,
  markThreadRead,
  useThread,
} from '@/lib/chat';
import { fetchMatch, starterFor, type MatchProfileRow } from '@/lib/matches';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color } from '@/theme/tokens';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = typeof id === 'string' ? id : null;
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [row, setRow] = useState<MatchProfileRow | null | 'loading'>('loading');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const [failed, setFailed] = useState(false);
  const { messages, send, loadOlder } = useThread(matchId, userId);
  // Without the inset the send button sits under the home indicator and
  // the bottom of it is not tappable.
  const insets = useSafeAreaInsets();

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

  // Newest first: the list is inverted so the thread grows upward.
  const ordered = useMemo(
    () =>
      messages === 'loading' || messages === null
        ? []
        : [...messages].reverse(),
    [messages],
  );

  // After every hook: hooks must run in the same order on each render.
  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

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
        <Link href="/matches" style={styles.link}>
          {t.chat.backToMatches}
        </Link>
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
    inFlight.current = true;
    setSending(true);
    setFailed(false);
    void send(body).then((ok) => {
      inFlight.current = false;
      setSending(false);
      if (!ok) {
        setFailed(true);
        return;
      }
      // Keep whatever the user typed while the insert was in flight.
      setDraft((current) => (current === body ? '' : current));
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="chat-screen"
    >
      <View style={styles.header}>
        <Link href="/matches" style={styles.back}>
          {t.chat.backToMatches}
        </Link>
        <Text style={styles.title}>{row.display_name}</Text>
        <Link
          href={{ pathname: '/match/[id]', params: { id: matchId } }}
          style={styles.back}
        >
          {t.chat.viewMatch}
        </Link>
      </View>

      <FlatList
        inverted
        data={ordered}
        keyExtractor={(m) => m.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        testID="chat-messages"
        // Inverted: the end of the list is the top of the thread, so this
        // is "scrolled back far enough, fetch older messages".
        onEndReached={() => void loadOlder()}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => {
          const mine = item.sender_id === userId;
          return (
            <View
              style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              testID={mine ? 'message-mine' : 'message-theirs'}
            >
              <Text style={styles.bubbleText}>{item.body}</Text>
            </View>
          );
        }}
        // The footer is the head of an inverted list, so this card sits at
        // the very start of the thread. Once anything has been said it is
        // in the way — and after sending the starter from /starter it was
        // the same sentence twice, one line apart.
        ListFooterComponent={
          ordered.length === 0 ? (
            <View style={styles.starterBox} testID="chat-starter">
              <Text style={styles.starterLabel}>{t.match.starterLabel}</Text>
              <Text style={styles.starterQuestion}>
                {starter?.question ?? t.match.noStarter}
              </Text>
              <Link
                href={{ pathname: '/starter/[id]', params: { id: matchId } }}
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

      {failed ? <Text style={styles.failed}>{t.chat.sendFailed}</Text> : null}
      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
        ]}
      >
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
          style={[styles.sendButton, canSend ? null : styles.sendDisabled]}
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
    </KeyboardAvoidingView>
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
  header: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  back: { color: color.textMuted, fontSize: 14 },
  title: { color: color.text, fontSize: 22, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: color.mine },
  theirs: { alignSelf: 'flex-start', backgroundColor: color.surface },
  bubbleText: { color: color.text, fontSize: 15, lineHeight: 21 },
  starterBox: {
    backgroundColor: color.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    marginBottom: 12,
  },
  starterLabel: { color: color.textMuted, fontSize: 11, letterSpacing: 1 },
  starterQuestion: { color: color.text, fontSize: 17, lineHeight: 24 },
  starterLink: { color: color.textMuted, fontSize: 14, paddingTop: 10 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: color.surface,
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
  sendLabel: { color: color.onBright, fontSize: 15, fontWeight: '600' },
  // The button's fill goes dark when it is disabled, which is how the
  // screen opens; the label has to follow it or it disappears. `textMuted`
  // rather than `textFaint`: 5.19:1 on this fill against 2.76:1, and this
  // branch put four other colours right for being under 3:1.
  sendLabelDisabled: { color: color.textMuted },
  failed: { color: color.danger, fontSize: 13, paddingHorizontal: 16 },
  muted: { color: color.textMuted, textAlign: 'center' },
  link: { color: color.textMuted, fontSize: 15, paddingVertical: 8 },
});
