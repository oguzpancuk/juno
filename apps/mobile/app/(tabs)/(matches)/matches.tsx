import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '@/components/Avatar';
import { fetchMatches, type MatchProfileRow } from '@/lib/matches';
import { usePhotoSources } from '@/lib/photos';
import { chatHref } from '@/lib/routes';
import { starterFor } from '@/lib/starter';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, space } from '@/theme/tokens';

/** Stable identity while the rows are still loading. */
const NO_PATHS: readonly string[] = [];

/** Each row's first photo, once — two rows never share a path. */
function firstPhotos(rows: readonly MatchProfileRow[]): string[] {
  const paths = new Set<string>();
  for (const row of rows) {
    const first = row.photos[0];
    if (first !== undefined) paths.add(first);
  }
  return [...paths];
}

export default function Matches() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [rows, setRows] = useState<MatchProfileRow[] | null | 'loading'>(
    'loading',
  );

  // On focus, not on mount: coming back from a thread must refresh the
  // unread badge and the preview, and expo-router keeps this screen
  // mounted while the thread is open.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      void fetchMatches().then((r) => {
        if (!cancelled) setRows(r);
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  // One request per first photo per visit (ADR-0006: authorised every
  // time, never cached), then back to the rows by path — never by index,
  // which is how one person's photo once landed on another's card.
  const paths =
    rows === 'loading' || rows === null ? NO_PATHS : firstPhotos(rows);
  const sources = usePhotoSources(paths);
  const sourceByPath = new Map(
    paths.map((path, i) => [path, sources[i] ?? null]),
  );

  // After every hook: hooks must run in the same order on each render.
  if (session.status === 'signed-out') return <RedirectToSignIn />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="matches-screen"
    >
      <Text style={styles.title}>{t.matches.title}</Text>
      {rows === 'loading' ? (
        <ActivityIndicator color={color.textMuted} />
      ) : rows === null ? (
        <Text style={styles.muted}>{t.errors.generic}</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.muted}>{t.matches.empty}</Text>
      ) : (
        [...rows]
          .sort((x, y) =>
            (y.last_at ?? y.matched_at).localeCompare(
              x.last_at ?? x.matched_at,
            ),
          )
          .map((row) => {
            const first = row.photos[0];
            return (
              <Link
                key={row.match_id}
                href={chatHref(row.match_id)}
                style={styles.card}
                testID={`conversation-${row.match_id}`}
              >
                <View style={styles.cardRow}>
                  <Avatar
                    name={row.display_name}
                    source={
                      first === undefined
                        ? null
                        : (sourceByPath.get(first) ?? null)
                    }
                    size={44}
                    testID="conversation-avatar"
                  />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHead}>
                      <Text style={styles.name} numberOfLines={1}>
                        {row.display_name}, {row.age}
                      </Text>
                      {row.unread_count > 0 ? (
                        <Text style={styles.badge} testID="unread-badge">
                          {row.unread_count}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.preview} numberOfLines={2}>
                      {row.last_body === null
                        ? ((userId
                            ? starterFor(row, userId)?.question
                            : null) ?? t.matches.noMessages)
                        : `${row.last_sender_id === userId ? t.matches.youPrefix : ''}${row.last_body}`}
                    </Text>
                  </View>
                </View>
              </Link>
            );
          })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, paddingTop: 64, gap: 12 },
  title: { color: color.text, fontSize: 26, fontWeight: '700' },
  muted: { color: color.textMuted },
  card: { backgroundColor: color.surface, borderRadius: 14, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardBody: { flex: 1 },
  name: { color: color.text, fontSize: 18, fontWeight: '600', flexShrink: 1 },
  preview: { color: color.textMuted, fontSize: 13, marginTop: 4 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    color: color.onBright,
    backgroundColor: color.cool,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'center',
    borderRadius: 11,
    paddingVertical: 3,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
});
