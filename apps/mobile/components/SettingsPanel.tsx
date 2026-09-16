import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlockedList } from '@/components/BlockedList';
import { LegalText } from '@/components/LegalText';
import { updateLocation } from '@/lib/discover';
import { deviceLocation } from '@/lib/location';
import { deleteAccount } from '@/lib/safety';
import { supabase } from '@/lib/supabase';
import { leaveToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, font, space, type } from '@/theme/tokens';

export type SettingsView = 'menu' | 'blocked' | 'legal';

/** The sheet's title for each view. */
export function settingsTitle(view: SettingsView): string {
  if (view === 'blocked') return t.blocked.title;
  if (view === 'legal') return t.legal.open;
  return t.settings.title;
}

/**
 * Sign out, then go to sign-in. Handed to the host through `onLeave`, so it
 * runs once the sheet is gone — never while it is up. Signing out is what
 * turns every screen's session to signed-out: supabase-js tells its
 * listeners before `signOut()` resolves, each signed-in screen answers
 * with `RedirectToSignIn`, and the profile's own guard unmounts this sheet
 * mid-presentation. Its `onDismissed` then never fires, and every one of
 * those navigations lands while iOS is still animating the modal away,
 * which is when iOS drops them (review, 2026-09-15). Best-effort: a failed
 * sign-out must still leave the screen. The server's /logout has a
 * deadline (lib/supabase.ts); a token refresh auth-js runs first, for a
 * session about to expire, does not — see the note there.
 */
function signOutAndLeave(): void {
  void supabase.auth
    .signOut()
    .catch(() => undefined)
    .then(() => leaveToSignIn());
}

/**
 * Settings, as the body of a popup opened from the profile (owner,
 * 2026-09-15). It was the `/settings` screen; everything it did it still
 * does, except send people to the discovery filters, which now open from
 * the deck itself.
 *
 * Blocked people and the privacy text open inside the same sheet rather
 * than as pages (owner, same day), with a way back to the list. The view
 * is the host's, because the title it names is the sheet's.
 *
 * Signing out and deleting the account do leave. What they need done —
 * the sign-out itself as well as the navigation — is handed to the host
 * through `onLeave`, which closes the sheet and runs it once the sheet is
 * gone (see `signOutAndLeave`).
 */
export function SettingsPanel({
  view,
  onView,
  onLeave,
}: {
  view: SettingsView;
  onView: (view: SettingsView) => void;
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
    void deleteAccount().then((ok) => {
      if (!ok) {
        deletingNow.current = false;
        setDeleting(false);
        setDeleteError(t.safety.deleteFailed);
        return;
      }
      // The account is gone; the stored session is now worthless. The
      // sheet stays locked on "deleting" until here, then closes, and the
      // best-effort sign-out and the navigation run once it has.
      onLeave(signOutAndLeave);
    });
  };

  if (view !== 'menu') {
    return (
      <View style={styles.panel}>
        <Pressable
          testID="settings-back"
          accessibilityRole="button"
          accessibilityLabel={t.settings.back}
          hitSlop={{ top: 10, bottom: 10, left: 16, right: 24 }}
          onPress={() => onView('menu')}
          style={({ pressed }) => [styles.backHit, pressed && styles.dim]}
        >
          <Text style={styles.back}>{t.settings.back}</Text>
        </Pressable>
        {view === 'blocked' ? <BlockedList /> : <LegalText />}
      </View>
    );
  }

  return (
    <View style={styles.panel} testID="settings-screen">
      <Pressable
        accessibilityRole="button"
        onPress={() => onView('blocked')}
        testID="open-blocked"
      >
        <Text style={styles.link}>{t.blocked.open}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => onView('legal')}
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
        style={[styles.button, deleting && styles.buttonBusy]}
        // A deletion in flight signs out on its own when it finishes.
        disabled={deleting}
        onPress={() => onLeave(signOutAndLeave)}
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
  // The same control as the pages' `BackLink`, minus the navigation.
  backHit: { alignSelf: 'flex-start', paddingVertical: space.sm },
  back: { ...type.body, color: color.textMuted },
  dim: { opacity: 0.6 },
  link: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 15,
    paddingVertical: 8,
  },
  label: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  hint: { fontFamily: font.regular, color: color.textFaint, fontSize: 12 },
  error: { fontFamily: font.regular, color: color.danger },
  ok: { fontFamily: font.regular, color: color.ok, fontSize: 13 },
  danger: { color: color.danger, fontSize: 15, fontFamily: font.semibold },
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
  buttonText: { color: color.text, fontSize: 15, fontFamily: font.semibold },
});
