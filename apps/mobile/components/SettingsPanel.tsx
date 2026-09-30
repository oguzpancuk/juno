import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, OutlineButton } from '@/components/ui';
import { BlockedList } from '@/components/BlockedList';
import { LegalText } from '@/components/LegalText';
import { PremiumPanel } from '@/components/PremiumPanel';
import { updateLocation } from '@/lib/discover';
import { deviceLocation } from '@/lib/location';
import { deleteAccount } from '@/lib/safety';
import { signOutAndLeave, useSession } from '@/lib/session';
import { LANGUAGES } from '@juno/astro';
import { LANGUAGE_NAMES } from '@/lib/i18n';
import { chooseLanguage, useLanguage } from '@/lib/language';
import type { LanguagePreference } from '@/lib/language-choice';
import { t } from '@/lib/strings';
import { color, font, radius, space, type } from '@/theme/tokens';

export type SettingsView =
  'menu' | 'blocked' | 'legal' | 'premium' | 'language';

/** The sheet's title for each view. */
export function settingsTitle(view: SettingsView): string {
  if (view === 'blocked') return t.blocked.title;
  if (view === 'legal') return t.legal.open;
  if (view === 'premium') return t.premium.title;
  if (view === 'language') return t.settings.language;
  return t.settings.title;
}

/**
 * Settings, as the body of a popup opened from the profile (owner,
 * 2026-09-15). It was the `/settings` screen; everything it did it still
 * does, except send people to the discovery filters, which now open from
 * the deck itself.
 *
 * Blocked people and the privacy text open inside the same sheet rather
 * than as pages (owner, same day), with a way back to the list — the
 * sheet's top-left chevron, which the host points at the list. The view
 * is the host's, because the title and the chevron it names are the
 * sheet's.
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
  const { preference } = useLanguage();
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

  // The way back to the list is the sheet's own chevron (the host passes
  // `onBack`), not a link of its own under the title.
  if (view === 'language') {
    return (
      <View style={styles.panel} testID="language-screen">
        <Card style={styles.group}>
          {(['device', ...LANGUAGES] as const).map((option) => (
            <Choice
              key={option}
              label={nameOf(option)}
              selected={option === preference}
              onPress={() => void chooseLanguage(option)}
              testID={`language-${option}`}
            />
          ))}
        </Card>
        <Text style={styles.hint}>{t.settings.languageHint}</Text>
      </View>
    );
  }

  if (view !== 'menu') {
    return (
      <View style={styles.panel}>
        {view === 'blocked' ? (
          <BlockedList />
        ) : view === 'premium' ? (
          <PremiumPanel />
        ) : (
          <LegalText />
        )}
      </View>
    );
  }

  return (
    <View style={styles.panel} testID="settings-screen">
      {/* Grouped rows, the way a settings list reads on the platform
          (owner, 2026-09-16: the flat buttons were disliked): what opens
          something ends in a chevron, what does something does not, and
          the one that cannot be undone sits alone in its own group.
          The membership is first: it is the only row here that offers
          something rather than changing something. */}
      <Card style={styles.group}>
        <Row
          label={t.settings.premium}
          chevron
          onPress={() => onView('premium')}
          testID="open-premium"
        />
      </Card>

      <Card style={styles.group}>
        <Row
          label={t.blocked.open}
          chevron
          onPress={() => onView('blocked')}
          testID="open-blocked"
        />
        <Row
          label={t.legal.open}
          chevron
          onPress={() => onView('legal')}
          testID="open-legal"
        />
        <Row
          label={t.settings.language}
          value={nameOf(preference)}
          chevron
          onPress={() => onView('language')}
          testID="open-language"
        />
        <Row
          label={
            locating === 'working'
              ? t.settings.locating
              : t.settings.updateLocation
          }
          disabled={locating === 'working'}
          onPress={() => void refreshLocation()}
          testID="refresh-location"
        />
      </Card>
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

      <Card style={styles.group}>
        <Row
          label={t.settings.signOut}
          // A deletion in flight signs out on its own when it finishes.
          disabled={deleting}
          // Handed to the host, which runs it once the sheet is gone —
          // never while it is up. Signing out turns every screen's session
          // to signed-out: supabase-js tells its listeners before
          // `signOut()` resolves, each signed-in screen answers with
          // `RedirectToSignIn`, and the profile's own guard unmounts this
          // sheet mid-presentation. Its `onDismissed` then never fires,
          // and every one of those navigations lands while iOS is still
          // animating the modal away, which is when iOS drops them
          // (review, 2026-09-15).
          onPress={() => onLeave(signOutAndLeave)}
          testID="sign-out"
        />
      </Card>

      <Card style={styles.group}>
        <Row
          label={deleting ? t.safety.deleting : t.safety.deleteAccount}
          danger
          disabled={deleting}
          onPress={() => {
            setDeleteError(null);
            setConfirmingDelete((open) => !open);
          }}
          testID="delete-account"
        />
        {confirmingDelete && !deleting ? (
          <View style={styles.confirm} testID="delete-confirm">
            <Text style={styles.hint}>{t.safety.deleteConfirm}</Text>
            <Pressable
              testID="delete-yes"
              style={({ pressed }) => [
                styles.confirmDanger,
                pressed && styles.dim,
              ]}
              onPress={doDelete}
            >
              <Text style={styles.danger}>{t.safety.deleteTitle}</Text>
            </Pressable>
            <OutlineButton
              label={t.safety.cancel}
              onPress={() => {
                setConfirmingDelete(false);
              }}
            />
          </View>
        ) : null}
      </Card>
      {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
    </View>
  );
}

/**
 * A language as the picker names it: each in its own name, so someone who
 * switched to a language they cannot read can still find their own, and
 * following the device in the language showing now.
 */
function nameOf(option: LanguagePreference): string {
  return option === 'device'
    ? t.settings.languageDevice
    : LANGUAGE_NAMES[option];
}

/** One line of a group: a label, and a chevron where it opens a page. */
function Row({
  label,
  value,
  chevron = false,
  danger = false,
  disabled = false,
  onPress,
  testID,
}: {
  label: string;
  /** What the page it opens is set to, drawn before the chevron. */
  value?: string;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      role="button"
      // The label and the value: the chevron is drawn, not said, and a
      // label replaces everything drawn inside the button, so a value
      // left out of it is one VoiceOver never reads.
      aria-label={value === undefined ? label : `${label}, ${value}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, (pressed || disabled) && styles.dim]}
      {...(testID === undefined ? {} : { testID })}
    >
      <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
      <View style={styles.rowEnd}>
        {value === undefined ? null : (
          <Text style={styles.rowValue}>{value}</Text>
        )}
        {chevron ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </Pressable>
  );
}

/** One option of a single choice: its name, and a tick on the chosen one. */
function Choice({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      role="radio"
      aria-label={label}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.dim]}
      testID={testID}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {selected ? <Text style={styles.tick}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The sheet supplies the gutter and the title; this is the list.
  panel: { gap: 12 },
  dim: { opacity: 0.6 },
  // A group is a card with its padding on the rows, so a row's touch
  // target runs edge to edge inside it.
  group: { padding: 0, gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowLabel: { ...type.body, color: color.text },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowValue: { ...type.body, color: color.textFaint },
  chevron: { fontSize: 22, lineHeight: 24, color: color.textFaint },
  tick: { ...type.body, color: color.coolLight },
  hint: { fontFamily: font.regular, color: color.textFaint, fontSize: 12 },
  error: { fontFamily: font.regular, color: color.danger },
  ok: { fontFamily: font.regular, color: color.ok, fontSize: 13 },
  danger: { ...type.body, color: color.danger, fontFamily: font.semibold },
  confirm: { gap: space.sm, padding: space.lg, paddingTop: 0 },
  confirmDanger: {
    backgroundColor: color.dangerSurface,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
});
