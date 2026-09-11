import { isLesserId, parseStarterKey, synastryReading } from '@juno/astro';
import type { SynastryAspectReading } from '@juno/astro';
import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Card, GradientButton, SectionLabel } from '@/components/ui';
import { sendMessage } from '@/lib/chat';
import { fetchMatch, type MatchProfileRow } from '@/lib/matches';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/** How many aspects to offer before the list starts over. */
const OFFERED = 5;

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
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, id]);

  const options = useMemo(
    () =>
      me && row && row !== 'loading' && userId
        ? starterOptions(me, row, userId)
        : [],
    [me, row, userId],
  );

  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

  if (row === 'loading' || (row && !me)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }
  if (!row || !userId) {
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
      // Replace, not push: coming back to a question already sent would
      // only invite sending it twice.
      router.replace(`/chat/${matchId}`);
    });
  };

  return (
    <View
      style={[styles.screen, { paddingBottom: insets.bottom + space.xl }]}
      testID="starter-screen"
    >
      <Link href={`/match/${matchId}`} style={styles.back}>
        {t.starter.back}
      </Link>
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
          <View style={styles.actions}>
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
          {failed ? (
            <Text style={styles.error} testID="starter-failed">
              {t.starter.sendFailed}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Body muted>{t.match.noStarter}</Body>
          <Link href={`/chat/${matchId}`} style={styles.link}>
            {t.chat.open}
          </Link>
        </>
      )}
    </View>
  );
}

/**
 * The questions to offer, best first.
 *
 * `synastryReading` ranks the aspects between the two charts viewer-first;
 * the like stored one of them in uuid order, which is the same aspect seen
 * from the other side when this viewer is the greater id. Matching it back
 * up puts the stored question first instead of offering it twice.
 */
function starterOptions(
  me: OwnProfile,
  row: MatchProfileRow,
  userId: string,
): readonly SynastryAspectReading[] {
  const { aspects } = synastryReading(me.chart, row.chart, OFFERED);
  const key = parseStarterKey(row.starter_key);
  if (!key) return aspects;
  const viewerIsA = isLesserId(userId, row.id);
  const mine = viewerIsA ? key.planetA : key.planetB;
  const theirs = viewerIsA ? key.planetB : key.planetA;
  const stored = aspects.findIndex(
    (reading) =>
      reading.aspect.planetA === mine &&
      reading.aspect.planetB === theirs &&
      reading.aspect.aspect === key.aspect,
  );
  // Outside the top `OFFERED`: `strongestOf` prefers a harmonious aspect
  // over a slightly stronger tense one, so the stored aspect is not always
  // the first by magnitude, and with a long aspect list it can fall off the
  // end. Leaving the list alone is right — it still leads with the
  // strongest — and costs only the guarantee that the match screen's
  // question appears here.
  if (stored <= 0) return aspects;
  const first = aspects[stored];
  if (!first) return aspects;
  return [first, ...aspects.filter((_, at) => at !== stored)];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    padding: space.xl,
    paddingTop: 64,
    gap: space.md,
  },
  center: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  back: { ...type.body, color: color.textMuted },
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
  actions: { gap: space.sm, marginTop: 'auto' },
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
