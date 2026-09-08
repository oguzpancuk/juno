import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchMatches, starterFor, type MatchProfileRow } from '@/lib/matches';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';

export default function Matches() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [rows, setRows] = useState<MatchProfileRow[] | null | 'loading'>(
    'loading',
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchMatches().then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // After every hook: hooks must run in the same order on each render.
  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="matches-screen"
    >
      <Link href="/discover" style={styles.back}>
        {t.settings.back}
      </Link>
      <Text style={styles.title}>{t.matches.title}</Text>
      {rows === 'loading' ? (
        <ActivityIndicator color="#9a94b8" />
      ) : rows === null ? (
        <Text style={styles.muted}>{t.errors.generic}</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.muted}>{t.matches.empty}</Text>
      ) : (
        rows.map((row) => (
          <Link
            key={row.match_id}
            href={{ pathname: '/match/[id]', params: { id: row.match_id } }}
            style={styles.card}
          >
            <View>
              <Text style={styles.name}>
                {row.display_name}, {row.age}
              </Text>
              <Text style={styles.starter} numberOfLines={2}>
                {userId ? (starterFor(row, userId) ?? t.match.noStarter) : ''}
              </Text>
            </View>
          </Link>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0b1a' },
  content: { padding: 24, paddingTop: 64, gap: 12 },
  back: { color: '#9a94b8', fontSize: 14 },
  title: { color: '#f5f2ff', fontSize: 26, fontWeight: '700' },
  muted: { color: '#9a94b8' },
  card: { backgroundColor: '#15142a', borderRadius: 14, padding: 14 },
  name: { color: '#f5f2ff', fontSize: 18, fontWeight: '600' },
  starter: { color: '#9a94b8', fontSize: 13, marginTop: 4 },
});
