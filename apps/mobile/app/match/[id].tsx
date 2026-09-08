import { SIGN_TR, synastryReading } from '@stardate/astro';
import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchMatch, starterFor, type MatchProfileRow } from '@/lib/matches';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [row, setRow] = useState<MatchProfileRow | null | 'loading'>('loading');
  const [me, setMe] = useState<OwnProfile | null>(null);

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

  // After every hook: hooks must run in the same order on each render.
  const reading = useMemo(
    () =>
      me && row && row !== 'loading'
        ? synastryReading(me.chart, row.chart, 5)
        : null,
    [me, row],
  );
  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

  if (row === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#9a94b8" />
      </View>
    );
  }
  if (!row || !userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t.errors.generic}</Text>
        <Link href="/discover" style={styles.link}>
          {t.match.backToDiscover}
        </Link>
      </View>
    );
  }
  const starter = starterFor(row, userId);
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="match-screen"
    >
      <Text style={styles.kicker}>{t.match.kicker}</Text>
      <Text style={styles.title}>{t.match.title(row.display_name)}</Text>
      <View style={styles.row}>
        <Chip label={t.chart.sun} value={SIGN_TR[row.big_three.sun]} />
        <Chip label={t.chart.moon} value={SIGN_TR[row.big_three.moon]} />
        <Chip label={t.chart.rising} value={SIGN_TR[row.big_three.rising]} />
      </View>

      <Text style={styles.label}>{t.match.starterLabel}</Text>
      {starter ? (
        <View style={styles.starterBox} testID="starter">
          <Text style={styles.starterHead}>{starter.headline}</Text>
          <Text style={styles.starterMeaning}>{starter.meaning}</Text>
          <Text style={styles.starterQuestion}>{starter.question}</Text>
        </View>
      ) : (
        <Text style={styles.starterMeaning}>{t.match.noStarter}</Text>
      )}

      {reading ? (
        <View style={styles.summary} testID="synastry">
          <Text style={styles.label}>{t.match.summary}</Text>
          <Text style={styles.score}>
            {reading.score}{' '}
            <Text style={styles.scoreLabel}>{t.discover.scoreLabel}</Text>
          </Text>
          <Text style={styles.body}>{reading.bandText}</Text>
          <Text style={styles.label}>{t.match.elements}</Text>
          <Text style={styles.bodyMuted}>{reading.sunElements}</Text>
          <Text style={styles.bodyMuted}>{reading.moonElements}</Text>
          <Text style={styles.label}>{t.match.aspects}</Text>
          {reading.aspects.map((a) => (
            <View
              key={`${a.aspect.planetA}-${a.aspect.aspect}-${a.aspect.planetB}`}
              style={styles.aspect}
            >
              <Text style={styles.aspectHead}>{a.headline}</Text>
              <Text style={styles.body}>{a.meaning}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Link
        href={{ pathname: '/chat/[id]', params: { id: row.match_id } }}
        style={styles.chatLink}
        testID="open-chat"
      >
        {t.chat.open}
      </Link>
      <Link href="/matches" style={styles.link}>
        {t.match.allMatches}
      </Link>
      <Link href="/discover" style={styles.link}>
        {t.match.backToDiscover}
      </Link>
    </ScrollView>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0b1a' },
  content: { padding: 24, paddingTop: 80, gap: 12, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b0b1a',
  },
  kicker: { color: '#7c6cff', fontSize: 14, letterSpacing: 2 },
  title: { color: '#f5f2ff', fontSize: 30, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    flex: 1,
    backgroundColor: '#15142a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  chipLabel: { color: '#9a94b8', fontSize: 11 },
  chipValue: {
    color: '#f5f2ff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  label: { color: '#9a94b8', fontSize: 12, letterSpacing: 1, marginTop: 12 },
  starterBox: {
    backgroundColor: '#15142a',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  starterHead: { color: '#c9c4e3', fontSize: 14 },
  starterMeaning: { color: '#d9d5ef', fontSize: 15, lineHeight: 22 },
  starterQuestion: {
    color: '#f5f2ff',
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '600',
  },
  summary: { gap: 6 },
  score: { color: '#f5f2ff', fontSize: 34, fontWeight: '800' },
  scoreLabel: { color: '#9a94b8', fontSize: 14, fontWeight: '400' },
  body: { color: '#d9d5ef', fontSize: 14, lineHeight: 20 },
  bodyMuted: { color: '#9a94b8', fontSize: 13, lineHeight: 19 },
  aspect: { backgroundColor: '#15142a', borderRadius: 12, padding: 12, gap: 4 },
  aspectHead: { color: '#f5f2ff', fontSize: 14, fontWeight: '600' },
  chatLink: {
    color: '#f5f2ff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#3b2f7a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    textAlign: 'center',
    marginTop: 12,
    overflow: 'hidden',
  },
  muted: { color: '#9a94b8' },
  link: { color: '#c9c4e3', fontSize: 15, paddingVertical: 8 },
});
