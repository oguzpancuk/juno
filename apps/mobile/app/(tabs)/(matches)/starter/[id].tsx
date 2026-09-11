import { Link, router, useLocalSearchParams } from 'expo-router';
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
  MAX_LABEL_SCALE,
  SectionLabel,
} from '@/components/ui';
import { sendMessage } from '@/lib/chat';
import { fetchMatch, type MatchProfileRow } from '@/lib/matches';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { chatHref } from '@/lib/routes';
import { starterOptions } from '@/lib/starter';
import { RedirectToSignIn, useSession } from '@/lib/session';
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
    void Promise.all([fetchMatch(id), fetchOwnProfile(userId)])
      .then(([r, p]) => {
        if (cancelled) return;
        setRow(r);
        setMe(p.status === 'ready' ? p.profile : null);
      })
      // Both reads carry their own timeout, so this catches a throw rather
      // than a hang — but either one leaves `loaded` false, and the
      // spinner branch of this screen has no way out of it.
      .catch(() => {
        if (!cancelled) setRow(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
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

  if (session.status === 'signed-out') return <RedirectToSignIn />;

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
        <BackLink label={t.chat.backToMatches} fallback="/matches" />
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
    const done = (sent: boolean) => {
      sendingNow.current = false;
      // Cleared on success too. POP_TO removes this route either way, so
      // today nothing sees the cleared state — but a screen that leaves
      // its primary action disabled on the way out is one navigation
      // change away from being stuck, and that is exactly how it got
      // stuck the last time.
      setSending(false);
      if (!sent) {
        setFailed(true);
        return;
      }
      // `dismissTo` (POP_TO), not `push` or `navigate`: this screen is
      // opened both from the match screen and from the thread itself.
      // With a thread already below it the stack pops back to that one;
      // with no thread in the stack POP_TO replaces this screen with it.
      // `navigate` does neither — it only reuses a route of the same name
      // as the current one, so from here it always pushed a second copy.
      router.dismissTo(`/chat/${matchId}`);
    };
    // The catch is the point of the `done` indirection: `sendMessage`
    // resolves false on every error postgrest reports, but a throw from
    // beneath it — a runtime without `AbortSignal.timeout`, say — would
    // otherwise leave the button disabled and reading "Gönderiliyor…" for
    // the life of the screen, which is the state the timeout exists to
    // prevent.
    void sendMessage(matchId, userId, current.question).then(
      (sent) => {
        done(sent !== null);
      },
      () => {
        done(false);
      },
    );
  };

  return (
    <View style={styles.screen} testID="starter-screen">
      {/* The question and its explanation scroll; the two buttons do not.
          A long question at a large accessibility text size is taller than
          a small phone, and the send button was laid out below the bottom
          of the display, where nothing can reach it. */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Pops to the chat this was opened from — its thread or its Uyum
            page; the fallback (a cold open) is the thread the label names. */}
        <BackLink label={t.starter.back} fallback={chatHref(matchId)} />
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
              <Text
                style={styles.secondaryText}
                maxFontSizeMultiplier={MAX_LABEL_SCALE}
              >
                {t.starter.another}
              </Text>
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
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  secondaryText: { ...type.heading, color: color.text, textAlign: 'center' },
  muted: { ...type.body, color: color.textMuted },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.md },
  error: { ...type.body, color: color.danger },
});
