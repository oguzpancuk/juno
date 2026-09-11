import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateLocation } from '@/lib/discover';
import { deviceLocation } from '@/lib/location';
import { deleteAccount } from '@/lib/safety';
import { supabase } from '@/lib/supabase';
import { leaveToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { BackLink } from '@/components/ui';
import { color } from '@/theme/tokens';

export default function Settings() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;

  type LocationState = 'idle' | 'working' | 'done' | 'denied' | 'failed';
  const [locating, setLocating] = useState<LocationState>('idle');

  // A ref, not the rendered state: two taps in one frame both read 'idle'
  // and would fire two permission prompts.
  const locatingNow = useRef(false);

  const refreshLocation = async () => {
    if (!userId || locatingNow.current) return;
    locatingNow.current = true;
    setLocating('working');
    const point = await deviceLocation();
    if (!point) {
      locatingNow.current = false;
      setLocating('denied');
      return;
    }
    const saved = await updateLocation(userId, point);
    locatingNow.current = false;
    setLocating(saved ? 'done' : 'failed');
  };

  const insets = useSafeAreaInsets();
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletingNow = useRef(false);

  // In-page confirmation, not Alert.alert: react-native-web renders Alert
  // as a no-op, so on the web client the delete never happened.
  const doDelete = () => {
    if (deletingNow.current) return;
    deletingNow.current = true;
    setDeleting(true);
    setDeleteError(null);
    void deleteAccount().then(async (ok) => {
      if (!ok) {
        deletingNow.current = false;
        setDeleting(false);
        setDeleteError(t.safety.deleteFailed);
        return;
      }
      // The account is gone; the stored session is now worthless.
      await supabase.auth.signOut();
      leaveToSignIn();
    });
  };

  return (
    <View
      style={[styles.screen, { paddingBottom: insets.bottom + 24 }]}
      testID="settings-screen"
    >
      <BackLink label={t.settings.back} fallback="/profile" />
      <Text style={styles.title}>{t.settings.title}</Text>
      <Link href="/blocked" style={styles.link}>
        {t.blocked.open}
      </Link>
      <Link href="/legal" style={styles.link}>
        {t.legal.open}
      </Link>
      <Link href="/filters" style={styles.link}>
        {t.filters.open}
      </Link>
      <Text style={styles.label}>{t.settings.location}</Text>
      <Pressable
        testID="refresh-location"
        style={[styles.button, locating === 'working' && styles.buttonBusy]}
        disabled={locating === 'working'}
        onPress={() => void refreshLocation()}
      >
        <Text style={styles.buttonText}>
          {locating === 'working'
            ? t.settings.locating
            : t.settings.updateLocation}
        </Text>
      </Pressable>
      {locating === 'done' ? (
        <Text style={styles.ok} testID="location-updated">
          {t.settings.locationUpdated}
        </Text>
      ) : null}
      {locating === 'denied' ? (
        <Text style={styles.error}>{t.settings.locationDenied}</Text>
      ) : null}
      {locating === 'failed' ? (
        <Text style={styles.error}>{t.settings.locationFailed}</Text>
      ) : null}
      <Text style={styles.hint}>{t.settings.locationHint}</Text>

      <Text style={styles.label}>{t.safety.title}</Text>
      <Pressable
        testID="delete-account"
        style={[styles.button, deleting && styles.buttonBusy]}
        disabled={deleting}
        onPress={() => {
          setDeleteError(null);
          setConfirmingDelete((open) => !open);
        }}
      >
        <Text style={styles.danger}>
          {deleting ? t.safety.deleting : t.safety.deleteAccount}
        </Text>
      </Pressable>
      {confirmingDelete && !deleting ? (
        <View style={styles.confirm} testID="delete-confirm">
          <Text style={styles.hint}>{t.safety.deleteConfirm}</Text>
          <Pressable
            testID="delete-yes"
            style={styles.confirmDanger}
            onPress={doDelete}
          >
            <Text style={styles.danger}>{t.safety.deleteTitle}</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => {
              setConfirmingDelete(false);
            }}
          >
            <Text style={styles.buttonText}>{t.safety.cancel}</Text>
          </Pressable>
        </View>
      ) : null}
      {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    padding: 24,
    paddingTop: 64,
    gap: 12,
  },
  back: { color: color.textMuted, fontSize: 14 },
  link: { color: color.textMuted, fontSize: 15, paddingVertical: 8 },
  title: { color: color.text, fontSize: 26, fontWeight: '700' },
  label: { color: color.textMuted, fontSize: 14, marginTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: color.surface,
  },
  chipOn: { backgroundColor: color.cool },
  chipText: { color: color.text },
  chipTextOn: { color: color.onBright, fontWeight: '600' },
  hint: { color: color.textFaint, fontSize: 12 },
  error: { color: color.danger },
  ok: { color: color.ok, fontSize: 13 },
  danger: { color: color.danger, fontSize: 15, fontWeight: '600' },
  confirm: { gap: 8 },
  confirmDanger: {
    backgroundColor: color.dangerSurface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  button: {
    backgroundColor: color.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: color.text, fontSize: 15, fontWeight: '600' },
});
