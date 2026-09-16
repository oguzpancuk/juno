import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '@/components/Avatar';
import { useScreenName } from '@/lib/a11y';
import { fetchMatches, type MatchProfileRow } from '@/lib/matches';
import { usePhotoSources } from '@/lib/photos';
import { chatHref } from '@/lib/routes';
import { starterFor } from '@/lib/starter';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { CosmicGround } from '@/components/CosmicGround';
import { t } from '@/lib/strings';
import { notifyUnreadChanged } from '@/lib/unread';
import { color, font, glass, radius, space, type } from '@/theme/tokens';

/** The new-match faces: large enough to read as people, not as badges. */
const STRIP_AVATAR = 64;

/** Matches with no message yet, newest first — the strip at the top. */
function fresh(rows: readonly MatchProfileRow[]): MatchProfileRow[] {
  return rows
    .filter((row) => row.last_at === null)
    .sort((x, y) => y.matched_at.localeCompare(x.matched_at));
}

/** Matches with a conversation, most recent message first — the list. */
function threads(rows: readonly MatchProfileRow[]): MatchProfileRow[] {
  return rows
    .filter(
      (row): row is MatchProfileRow & { last_at: string } =>
        row.last_at !== null,
    )
    .sort((x, y) => y.last_at.localeCompare(x.last_at));
}

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
  useScreenName(t.tabs.matches);
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
      // The tab's badge reads the same column; bring it along, for when
      // the Realtime socket missed a change the list has just picked up.
      notifyUnreadChanged();
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
    <View style={styles.screen}>
      <CosmicGround planet={false} horizon={false} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        testID="matches-screen"
      >
        {rows === 'loading' ? (
          <ActivityIndicator color={color.textMuted} />
        ) : rows === null ? (
          <Text style={styles.muted}>{t.errors.generic}</Text>
        ) : (
          <>
            {/* The top of the screen, now that it has no heading (owner,
              2026-09-15): the matches nobody has written to yet, as a row
              of faces. Always there once the rows are in, so the top is
              never bare — with nothing new it says so rather than
              collapsing. A match leaves this row for the list below the
              moment its first message is sent. */}
            <Text style={styles.sectionLabel}>{t.matches.newMatches}</Text>
            {fresh(rows).length === 0 ? (
              <Text style={styles.stripEmpty} testID="new-matches-empty">
                {t.matches.noNewMatches}
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.strip}
                // The strip scrolls sideways inside a page that scrolls down;
                // it must not swallow the page's own content inset.
                style={styles.stripFrame}
                testID="new-matches"
              >
                {fresh(rows).map((row) => {
                  const first = row.photos[0];
                  return (
                    // `asChild` so the tap target is a View: a bare `Link`
                    // renders as Text on iOS, and its line box cut the top
                    // off the round photo.
                    <Link
                      key={row.match_id}
                      href={chatHref(row.match_id)}
                      asChild
                    >
                      <Pressable
                        // A plain style, not a function: `asChild` hands the
                        // props through a slot that drops a style callback,
                        // which left the name unaligned under the photo.
                        style={styles.stripItem}
                        accessibilityRole="button"
                        accessibilityLabel={row.display_name}
                        testID={`new-match-${row.match_id}`}
                      >
                        <Avatar
                          name={row.display_name}
                          source={
                            first === undefined
                              ? null
                              : (sourceByPath.get(first) ?? null)
                          }
                          size={STRIP_AVATAR}
                        />
                        <Text style={styles.stripName} numberOfLines={1}>
                          {row.display_name}
                        </Text>
                      </Pressable>
                    </Link>
                  );
                })}
              </ScrollView>
            )}
            {threads(rows).map((row) => {
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
                      <Text style={styles.name} numberOfLines={1}>
                        {row.display_name}, {row.age}
                      </Text>
                      <Text style={styles.preview} numberOfLines={2}>
                        {row.last_body === null
                          ? ((userId
                              ? starterFor(row, userId)?.question
                              : null) ?? t.matches.noMessages)
                          : `${row.last_sender_id === userId ? t.matches.youPrefix : ''}${row.last_body}`}
                      </Text>
                    </View>
                    {/* Beside the whole row, centred on it, rather than on
                      the name's line (owner, 2026-09-15). */}
                    {row.unread_count > 0 ? (
                      <Text style={styles.badge} testID="unread-badge">
                        {row.unread_count}
                      </Text>
                    ) : null}
                  </View>
                </Link>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: 64, gap: 12 },
  muted: { fontFamily: font.regular, color: color.textMuted },
  sectionLabel: { ...type.label, color: color.textFaint },
  // Runs to both screen edges like the photos do, so the faces scroll out
  // from under the gutter rather than being cut off inside it.
  stripFrame: { marginHorizontal: -24 },
  strip: { paddingHorizontal: 24, gap: space.lg, paddingBottom: space.sm },
  stripItem: {
    width: STRIP_AVATAR + space.sm,
    alignItems: 'center',
    gap: space.xs,
  },
  stripName: {
    ...type.caption,
    color: color.textMuted,
    maxWidth: STRIP_AVATAR + space.sm,
  },
  stripEmpty: {
    ...type.bodySmall,
    color: color.textMuted,
    paddingBottom: space.sm,
  },
  card: {
    backgroundColor: glass.fill,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.edge,
    padding: 14,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardBody: { flex: 1 },
  name: {
    color: color.text,
    fontSize: 18,
    fontFamily: font.semibold,
    flexShrink: 1,
  },
  preview: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    color: color.onBright,
    backgroundColor: color.cool,
    fontSize: 12,
    fontFamily: font.semibold,
    minWidth: 22,
    textAlign: 'center',
    borderRadius: 11,
    paddingVertical: 3,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
});
