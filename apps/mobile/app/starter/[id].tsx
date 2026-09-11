import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackLink,
  Body,
  Card,
  GradientButton,
  SectionLabel,
} from '@/components/ui';
import { sendMessage } from '@/lib/chat';
import { fetchMatch, type MatchProfileRow } from '@/lib/matches';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { starterOptions } from '@/lib/starter';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/**
 * The conversation starter as its own surface: one question at a time,
 * send it or step to the next.
 *
 * The first question is the one the match screen shows — the aspect stored
 * on the like — so the two screens never disagree about what "your starter"
 * is. The rest are the next-strongest aspects between the two charts, which
 * is also where the match screen's cards come from.
 */
export default function StarterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StarterView key={typeof id === 'string' ? id : 'none'} id={id} />;
}

function StarterView({ id }: { id: string | string[] | undefined }) {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const insets = useSafeAreaInsets();
  const [row, setRow] = useState<MatchProfileRow | null | 'loading'>(
    typeof id === 'string' ? 'loading' : null,
  );
  const [me, setMe] = useState<OwnProfile | null>(null);
  // Separate from `me`: a failed own-profile read also leaves `me` null,
  // and treating that as "still loading" spun for ever on a screen with no
  // way back. The starter itself only needs the key on the match row.
  const [loaded, setLoaded] = useState(typeof id !== 'string');
  const [shown, setShown] = useState(0);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const sendingNow = useRef(false);

  useEffect(() => {
    if (!userId || typeof id !== 'string') return;
    let cancelled = false;
    void Promise.all([fetchMatch(id), fetchOwnProfile(userId)]).then(
      ([r, p]) => {
        if (cancelled) return;
        setRow(r);
        setMe(p.status === 'ready' ? p.profile : null);
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, id]);

  const options = useMemo(
    () =>
      row && row !== 'loading' && userId
        ? starterOptions(me?.chart ?? null, row, userId)
        : [],
    [me, row, userId],
  );

  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }
  if (!row || row === 'loading' || !userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t.errors.generic}</Text>
        <Link href="/matches" style={styles.link}>
          {t.match.allMatches}
        </Link>
      </View>
    );
  }

  const matchId = row.match_id;
  const current = options[shown % Math.max(options.length, 1)];

  const send = () => {
    if (sendingNow.current || !current) return;
    sendingNow.current = true;
    setSending(true);
    setFailed(false);
    void sendMessage(matchId, userId, current.question).then((sent) => {
      sendingNow.current = false;
      if (!sent) {
        setSending(false);
        setFailed(true);
        return;
      }
      // `navigate`, not `push` or `replace`: this screen is opened both
      // from the match screen and from the thread itself, and navigate
      // returns to the thread already on the stack rather than stacking a
      // second copy of it. Either way the question just sent is not left
      // behind to be sent again.
      router.navigate(`/chat/${matchId}`);
    });
  };

  return (
    <View style={styles.screen} testID="starter-screen">
      {/* The question and its explanation scroll; the two buttons do not.
          A long question at a large accessibility text size is taller than
          a small phone, and the send button was laid out below the bottom
          of the display, where nothing can reach it. */}
      <ScrollView contentContainerStyle={styles.content}>
        <BackLink label={t.starter.back} fallback={`/match/${matchId}`} />
        <Text style={styles.title}>{t.starter.title(row.display_name)}</Text>
        {current ? (
          <>
            <View style={styles.headRow}>
              <SectionLabel>{t.starter.label}</SectionLabel>
              {options.length > 1 ? (
                <Text style={styles.counter} testID="starter-counter">
                  {t.starter.counter(
                    (shown % options.length) + 1,
                    options.length,
                  )}
                </Text>
              ) : null}
            </View>
            <Card testID="starter-card">
              <Text style={styles.aspect}>{current.headline}</Text>
              <Text style={styles.question} testID="starter-question">
                {current.question}
              </Text>
              <Text style={styles.meaning}>{current.meaning}</Text>
            </Card>
            <Text style={styles.hint}>{t.starter.hint}</Text>
          </>
        ) : (
          <>
            <Body muted>{t.match.noStarter}</Body>
            <Link href={`/chat/${matchId}`} style={styles.link}>
              {t.chat.open}
            </Link>
          </>
        )}
      </ScrollView>
      {current ? (
        <View
          style={[styles.actions, { paddingBottom: insets.bottom + space.lg }]}
        >
          {failed ? (
            <Text style={styles.error} testID="starter-failed">
              {t.starter.sendFailed}
            </Text>
          ) : null}
          <GradientButton
            testID="starter-send"
            label={sending ? t.starter.sending : t.starter.send}
            disabled={sending}
            onPress={send}
          />
          {options.length > 1 ? (
            <Pressable
              testID="starter-next"
              style={styles.secondary}
              disabled={sending}
              onPress={() => {
                setFailed(false);
                setShown((n) => n + 1);
              }}
            >
              <Text style={styles.secondaryText}>{t.starter.another}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: {
    padding: space.xl,
    paddingTop: 64,
    paddingBottom: space.md,
    gap: space.md,
  },
  center: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  title: { ...type.display, color: color.text },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.md,
  },
  counter: { ...type.caption, color: color.textMuted },
  aspect: { ...type.caption, color: color.textMuted },
  question: {
    ...type.display,
    color: color.text,
    fontSize: 24,
    lineHeight: 32,
    marginTop: space.sm,
  },
  meaning: { ...type.body, color: color.textMuted, marginTop: space.md },
  hint: { ...type.bodySmall, color: color.textFaint },
  actions: {
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.bg,
  },
  secondary: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryText: { ...type.heading, color: color.text },
  muted: { ...type.body, color: color.textMuted },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.md },
  error: { ...type.body, color: color.danger },
});
