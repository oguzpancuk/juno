import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchBlocked, unblockUser, type BlockedPerson } from '@/lib/safety';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { BackLink } from '@/components/ui';
import { color } from '@/theme/tokens';

/**
 * Everyone the member has blocked, and a way back. Apple requires the
 * block to be reachable; a block nobody can undo is worse than none,
 * because the only way out would be deleting the account.
 */
export default function Blocked() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<BlockedPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const working = useRef(false);

  // On focus, not on mount: a block filed from a chat while this screen
  // sits in the stack would otherwise never show up.
  useFocusEffect(
    useCallback(() => {
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
    }, []),
  );

  if (session.status === 'signed-out') return <RedirectToSignIn />;

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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      testID="blocked-screen"
    >
      <BackLink label={t.blocked.back} fallback="/settings" />
      <Text style={styles.title}>{t.blocked.title}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, paddingTop: 64, gap: 10 },
  back: { color: color.textMuted, fontSize: 14 },
  title: { color: color.text, fontSize: 26, fontWeight: '700' },
  hint: { color: color.textFaint, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.surface,
    borderRadius: 14,
    padding: 14,
  },
  name: { color: color.text, fontSize: 15 },
  undo: { color: color.textMuted, fontSize: 13 },
  error: { color: color.danger, fontSize: 13 },
});
