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
  const { messages, send } = useThread(matchId, userId);
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
        <ActivityIndicator color="#9a94b8" />
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
        ListFooterComponent={
          <View style={styles.starterBox} testID="chat-starter">
            <Text style={styles.starterLabel}>{t.match.starterLabel}</Text>
            <Text style={styles.starterQuestion}>
              {starter?.question ?? t.match.noStarter}
            </Text>
          </View>
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
          placeholderTextColor="#5f5a7a"
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
          <Text style={styles.sendLabel}>{t.chat.send}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0b1a' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b0b1a',
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1a33',
  },
  back: { color: '#9a94b8', fontSize: 14 },
  title: { color: '#f5f2ff', fontSize: 22, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#3b2f7a' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#15142a' },
  bubbleText: { color: '#f5f2ff', fontSize: 15, lineHeight: 21 },
  starterBox: {
    backgroundColor: '#15142a',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    marginBottom: 12,
  },
  starterLabel: { color: '#9a94b8', fontSize: 11, letterSpacing: 1 },
  starterQuestion: { color: '#f5f2ff', fontSize: 17, lineHeight: 24 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1c1a33',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: '#15142a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f5f2ff',
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#7c6cff',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendDisabled: { backgroundColor: '#2a2647' },
  sendLabel: { color: '#f5f2ff', fontSize: 15, fontWeight: '600' },
  failed: { color: '#ff9a9a', fontSize: 13, paddingHorizontal: 16 },
  muted: { color: '#9a94b8', textAlign: 'center' },
  link: { color: '#c9c4e3', fontSize: 15, paddingVertical: 8 },
});
