import { bandName, compatibility } from '@juno/astro';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '@/components/Avatar';
import { PremiumPanel } from '@/components/PremiumPanel';
import { Card, LinkText } from '@/components/ui';
import { swipe } from '@/lib/discover';
import { usePhotoSources } from '@/lib/photos';
import {
  admirerOf,
  daysSince,
  fetchLikedMe,
  type Admirer,
  type LikedMeRow,
  type LikedMeState,
} from '@/lib/premium';
import type { OwnProfile } from '@/lib/profile';
import { t } from '@/lib/strings';
import { color, font, radius, space, type } from '@/theme/tokens';

const AVATAR = 52;

/**
 * Who has liked you and is still waiting for an answer.
 *
 * A premium member sees the people; a free one sees how many there are,
 * which of them pressed the star, and when — and the membership under
 * them. That is not a blur the client draws over rows it holds: the
 * `liked_me` view leaves every identifying column null for a free
 * member, so the names and the photographs never reach the device.
 *
 * Answering from here is the point of the list: ♥ closes the match in
 * that round trip, because their like is already in.
 */
export function LikedMePanel({
  me,
  onAnswered,
  onOpen,
}: {
  me: OwnProfile;
  /** A like or a pass here changes the deck; the host reloads it. */
  onAnswered?: () => void;
  /**
   * Somebody was tapped: the host takes the deck to them (owner,
   * 2026-09-23). The caption is this row's own "when" line, so the
   * profile the host may end up showing says the same thing the row did.
   */
  onOpen?: (person: Admirer, caption: string) => void;
}) {
  const [state, setState] = useState<LikedMeState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // `me` is what the host read when the deck loaded, and buying the
  // membership from the panel at the bottom of this sheet does not change
  // it — nothing remounts us. Without this the rows refetch, come back
  // with the people in them, and are drawn as locked bars under a panel
  // that says the membership is active.
  const [bought, setBought] = useState(false);
  const premium = me.is_premium || bought;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not the rendered flag: two taps in one frame both read `false`.
  const working = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetchLikedMe().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Memoised, not derived inline: the list below is memoised on it, and
  // a fresh [] on every render would remake that on every render too.
  const rows = useMemo(
    () => (state.status === 'ready' ? state.rows : []),
    [state],
  );
  const people = useMemo(
    () =>
      rows
        .map((row) => admirerOf(row))
        .filter((person): person is Admirer => person !== null),
    [rows],
  );
  // One photo each, the first, as a circle. The whole profile is a swipe
  // away on the deck once the match is closed.
  const paths = useMemo(
    () => people.map((person) => person.photos[0] ?? ''),
    [people],
  );
  const sources = usePhotoSources(paths);

  const answer = (person: Admirer, kind: 'like' | 'pass') => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    void swipe(
      { id: me.id, chart: me.chart },
      { id: person.id, chart: person.chart },
      kind,
    )
      .then((result) => {
        if (!result.ok && result.reason !== 'gone') {
          setError(t.likedMe.failed);
          return;
        }
        // Gone or answered, the row has no business in this list any
        // more, and the deck it was also on has to be reloaded.
        setState((current) =>
          current.status === 'ready'
            ? {
                status: 'ready',
                rows: current.rows.filter((row) => row.id !== person.id),
              }
            : current,
        );
        onAnswered?.();
      })
      .catch(() => setError(t.likedMe.failed))
      .finally(() => {
        working.current = false;
        setBusy(false);
      });
  };

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{t.errors.generic}</Text>
        <LinkText
          testID="liked-me-retry"
          onPress={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          {t.common.retry}
        </LinkText>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.center} testID="liked-me-empty">
        <Text style={styles.muted}>{t.likedMe.empty}</Text>
      </View>
    );
  }

  if (!premium) {
    return (
      <View style={styles.panel} testID="liked-me-locked">
        <Text style={styles.lockedTitle}>
          {t.likedMe.lockedTitle(rows.length)}
        </Text>
        <Text style={styles.muted}>{t.likedMe.lockedHint}</Text>
        <Card style={styles.list}>
          {rows.map((row, index) => (
            <LockedRow key={`${row.liked_at}-${index}`} row={row} />
          ))}
        </Card>
        <PremiumPanel
          onBought={() => {
            // Back to the spinner while the view is asked again: the rows
            // in hand are the locked shape, and drawing them as people
            // would draw nobody.
            setState({ status: 'loading' });
            setBought(true);
            setAttempt((n) => n + 1);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.panel} testID="liked-me-list">
      {people.map((person, index) => {
        const match = compatibility(me.chart, person.chart);
        return (
          <Card
            key={person.id}
            style={styles.row}
            testID={`admirer-${person.id}`}
          >
            {/* The person, and a tap on them: the deck goes to their
                card and this sheet closes. The two answer buttons are
                outside it, so ♥ is still one press from here. */}
            <Pressable
              style={({ pressed }) => [styles.person, pressed && styles.dim]}
              accessibilityRole="button"
              accessibilityLabel={t.likedMe.openPerson(person.display_name)}
              disabled={busy || onOpen === undefined}
              onPress={() => onOpen?.(person, agoLine(person.liked_at))}
              testID={`open-admirer-${person.id}`}
            >
              <Avatar
                name={person.display_name}
                source={sources[index] ?? null}
                size={AVATAR}
              />
              <View style={styles.who}>
                <Text style={styles.name}>
                  {person.display_name}, {person.age}
                </Text>
                <Text style={styles.meta}>
                  {bandName(match.score)} {t.discover.scoreLabel} ·{' '}
                  {agoLine(person.liked_at)}
                </Text>
                {person.is_super ? (
                  <Text style={styles.super} testID="admirer-super">
                    ★ {t.likedMe.superBadge}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                testID={`pass-back-${person.id}`}
                accessibilityRole="button"
                accessibilityLabel={t.likedMe.passBack}
                disabled={busy}
                onPress={() => answer(person, 'pass')}
                style={({ pressed }) => [
                  styles.round,
                  (pressed || busy) && styles.dim,
                ]}
              >
                <Text style={styles.glyph}>✕</Text>
              </Pressable>
              <Pressable
                testID={`like-back-${person.id}`}
                accessibilityRole="button"
                accessibilityLabel={t.likedMe.likeBack}
                disabled={busy}
                onPress={() => answer(person, 'like')}
                style={({ pressed }) => [
                  styles.round,
                  styles.roundOn,
                  (pressed || busy) && styles.dim,
                ]}
              >
                <Text style={[styles.glyph, styles.glyphOn]}>♥</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** A row a free member gets: the star, the day, and no person. */
function LockedRow({ row }: { row: LikedMeRow }) {
  return (
    <View style={styles.lockedRow}>
      <View style={styles.lockedAvatar}>
        <Text style={styles.lockedGlyph}>{row.is_super ? '★' : '♥'}</Text>
      </View>
      <View style={styles.who}>
        <View style={styles.bar} />
        <Text style={styles.meta}>
          {row.is_super ? `${t.likedMe.superBadge} · ` : ''}
          {agoLine(row.liked_at)}
        </Text>
      </View>
    </View>
  );
}

function agoLine(likedAt: string): string {
  const days = daysSince(likedAt);
  if (days === 0) return t.likedMe.today;
  if (days === 1) return t.likedMe.yesterday;
  return t.likedMe.daysAgo(days);
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  muted: { ...type.body, color: color.textMuted },
  error: { ...type.body, color: color.danger },
  lockedTitle: { ...type.heading, color: color.text },
  list: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  // The avatar and the words, as one target.
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  who: { flex: 1, gap: 2 },
  name: { ...type.body, color: color.text, fontFamily: font.semibold },
  meta: { ...type.bodySmall, color: color.textFaint },
  super: { ...type.bodySmall, color: color.warm, fontFamily: font.semibold },
  actions: { flexDirection: 'row', gap: space.sm },
  round: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOn: { backgroundColor: color.cool, borderColor: color.cool },
  glyph: { fontSize: 18, color: color.text },
  glyphOn: { color: color.onBright },
  dim: { opacity: 0.6 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lockedAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: color.surfaceSoft,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedGlyph: { fontSize: 20, color: color.textFaint },
  // What a name would be, if the view had sent one.
  bar: {
    height: 10,
    width: '60%',
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSoft,
  },
});
