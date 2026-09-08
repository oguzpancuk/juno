import { SIGN_TR } from '@stardate/astro';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchMatch, starterFor, type MatchProfileRow } from '@/lib/matches';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [row, setRow] = useState<MatchProfileRow | null | 'loading'>('loading');

  useEffect(() => {
    if (!userId || typeof id !== 'string') return;
    let cancelled = false;
    void fetchMatch(id).then((r) => {
      if (!cancelled) setRow(r);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, id]);

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
    <View style={styles.screen} testID="match-screen">
      <Text style={styles.kicker}>{t.match.kicker}</Text>
      <Text style={styles.title}>{t.match.title(row.display_name)}</Text>
      <View style={styles.row}>
        <Chip label={t.chart.sun} value={SIGN_TR[row.big_three.sun]} />
        <Chip label={t.chart.moon} value={SIGN_TR[row.big_three.moon]} />
        <Chip label={t.chart.rising} value={SIGN_TR[row.big_three.rising]} />
      </View>
      <Text style={styles.starterLabel}>{t.match.starterLabel}</Text>
      <Text style={styles.starter} testID="starter">
        {starter ?? t.match.noStarter}
      </Text>
      <Text style={styles.hint}>{t.match.chatSoon}</Text>
      <Link href="/matches" style={styles.link}>
        {t.match.allMatches}
      </Link>
      <Link href="/discover" style={styles.link}>
        {t.match.backToDiscover}
      </Link>
    </View>
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
  screen: {
    flex: 1,
    backgroundColor: '#0b0b1a',
    padding: 24,
    paddingTop: 96,
    gap: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b0b1a',
  },
  kicker: { color: '#7c6cff', fontSize: 14, letterSpacing: 2 },
  title: { color: '#f5f2ff', fontSize: 30, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
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
  starterLabel: {
    color: '#9a94b8',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
  },
  starter: {
    color: '#f5f2ff',
    fontSize: 20,
    lineHeight: 28,
    backgroundColor: '#15142a',
    borderRadius: 16,
    padding: 16,
  },
  hint: { color: '#5f5a7a', fontSize: 12 },
  muted: { color: '#9a94b8' },
  link: { color: '#c9c4e3', fontSize: 15, paddingVertical: 8 },
});
