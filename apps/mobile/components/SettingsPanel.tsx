import type { Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { updateLocation } from '@/lib/discover';
import { deviceLocation } from '@/lib/location';
import { deleteAccount } from '@/lib/safety';
import { supabase } from '@/lib/supabase';
import { leaveToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color } from '@/theme/tokens';

/**
 * Settings, as the body of a popup opened from the profile (owner,
 * 2026-09-15). It was the `/settings` screen; everything it did it still
 * does, except send people to the discovery filters, which now open from
 * the deck itself.
 *
 * Every way out is handed to the host, because only the host owns the
 * sheet and a navigation issued while it is still on screen is dropped on
 * iOS: `onOpen` for the two pages that are still pages (blocked people,
 * privacy), `onLeave` with the navigation a sign-out or a deleted account
 * needs. The host closes the sheet and runs either once it is gone.
 */
export function SettingsPanel({
  onOpen,
  onLeave,
}: {
  onOpen: (href: Href) => void;
  onLeave: (navigate: () => void) => void;
}) {
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
      // The account is gone; the stored session is now worthless. A
      // failure here must not strand the person on a screen for an
      // account that no longer exists, so the sign-out is best-effort and
      // the navigation happens either way.
      await supabase.auth.signOut().catch(() => undefined);
      onLeave(leaveToSignIn);
    });
  };

  return (
    <View style={styles.panel} testID="settings-screen">
      <Pressable
        accessibilityRole="link"
        onPress={() => onOpen('/blocked')}
        testID="open-blocked"
      >
        <Text style={styles.link}>{t.blocked.open}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => onOpen('/settings/legal')}
        testID="open-legal"
      >
        <Text style={styles.link}>{t.legal.open}</Text>
      </Pressable>
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
        testID="sign-out"
        style={styles.button}
        onPress={() => {
          // Best-effort: a failed sign-out must still leave the screen,
          // and the session hook clears on the next auth event either way.
          void supabase.auth
            .signOut()
            .catch(() => undefined)
            .then(() => {
              onLeave(leaveToSignIn);
            });
        }}
      >
        <Text style={styles.buttonText}>{t.settings.signOut}</Text>
      </Pressable>
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
  // The sheet supplies the gutter and the title; this is the list.
  panel: { gap: 12 },
  link: { color: color.textMuted, fontSize: 15, paddingVertical: 8 },
  label: { color: color.textMuted, fontSize: 14, marginTop: 12 },
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
    backgroundColor: color.surfaceSoft,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: color.text, fontSize: 15, fontWeight: '600' },
});
