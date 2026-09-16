import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchBlocked, unblockUser, type BlockedPerson } from '@/lib/safety';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, font } from '@/theme/tokens';

/**
 * Everyone the member has blocked, and a way back. Apple requires the
 * block to be reachable; a block nobody can undo is worse than none,
 * because the only way out would be deleting the account.
 *
 * Shown inside the settings sheet (owner, 2026-09-15); it was the
 * `/blocked` page. Read on mount, which is every time the sheet shows it:
 * a block filed from a chat since the last look is there.
 */
export function BlockedList() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [people, setPeople] = useState<BlockedPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const working = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetchBlocked().then((list) => {
      if (cancelled) return;
      if (list === null) {
        // An empty list, not a spinner: a failed read used to leave the
        // screen loading for ever with an error underneath it.
        setError(t.errors.generic);
        setPeople([]);
      } else {
        setError(null);
        setPeople(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const undo = (person: BlockedPerson) => {
    if (!userId || working.current) return;
    working.current = true;
    setError(null);
    void unblockUser(userId, person.blocked_id).then((ok) => {
      working.current = false;
      if (!ok) {
        setError(t.errors.generic);
        return;
      }
      setPeople((list) =>
        (list ?? []).filter((p) => p.blocked_id !== person.blocked_id),
      );
    });
  };

  return (
    <View style={styles.list} testID="blocked-screen">
      <Text style={styles.hint}>{t.blocked.hint}</Text>
      {people === null ? (
        <ActivityIndicator color={color.textMuted} />
      ) : people.length === 0 ? (
        <Text style={styles.hint}>{t.blocked.empty}</Text>
      ) : (
        people.map((person) => (
          <View key={person.blocked_id} style={styles.row}>
            <Text style={styles.name}>{person.display_name}</Text>
            <Pressable
              testID={`unblock-${person.blocked_id}`}
              onPress={() => {
                undo(person);
              }}
            >
              <Text style={styles.undo}>{t.blocked.undo}</Text>
            </Pressable>
          </View>
        ))
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  hint: { fontFamily: font.regular, color: color.textFaint, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.surface,
    borderRadius: 14,
    padding: 14,
  },
  name: { fontFamily: font.regular, color: color.text, fontSize: 15 },
  undo: { fontFamily: font.regular, color: color.textMuted, fontSize: 13 },
  error: { fontFamily: font.regular, color: color.danger, fontSize: 13 },
});
