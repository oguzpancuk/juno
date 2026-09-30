import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CosmicGround } from '@/components/CosmicGround';
import { LegalLink } from '@/components/LegalText';
import {
  GradientButton,
  OutlineButton,
  SCREEN_TOP_GUTTER,
} from '@/components/ui';
import { acceptCurrentNotice } from '@/lib/consent';
import { useBottomGap, useTopClearance } from '@/lib/insets';
import { LEGAL_UPDATED } from '@/lib/legal';
import { deleteAccount } from '@/lib/safety';
import { RedirectToSignIn, signOutAndLeave, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, font, radius, space } from '@/theme/tokens';

/**
 * Re-consent (KVKK). A member whose record names an older privacy notice
 * lands here from the entry screen or from the tabs' gate
 * (`lib/consent.ts`), and nothing else opens until they choose: accept
 * the current text, delete the account, or sign out and be asked again
 * next time.
 *
 * The same shape as onboarding's consent — a box that must be ticked, the
 * full text one tap away in a popup — because it is the same act. The
 * sentence beside the box differs: onboarding names the two purposes it
 * starts, this one accepts the text as it now stands, whatever changed
 * in it.
 *
 * Deleting is offered here and not only in settings, because settings is
 * behind this screen: without it, the one way to withdraw consent the
 * notice promises would be unreachable to exactly the person who wants
 * it. The in-page confirmation is settings' own, for the same reason
 * (react-native-web renders `Alert` as a no-op).
 */
export default function Consent() {
  const session = useSession();
  const topPadding = useTopClearance(SCREEN_TOP_GUTTER);
  const bottomGap = useBottomGap(32);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Refs, not the rendered state: two taps in one frame both read the
  // state from before either landed.
  const busyNow = useRef(false);

  if (session.status === 'signed-out') return <RedirectToSignIn />;
  if (session.status !== 'signed-in') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }
  const userId = session.session.user.id;

  const accept = async () => {
    if (busyNow.current) return;
    if (!agreed) {
      setError(t.onboarding.errors.consent);
      return;
    }
    busyNow.current = true;
    setError(null);
    setSaving(true);
    const ok = await acceptCurrentNotice(userId);
    if (!ok) {
      busyNow.current = false;
      setSaving(false);
      setError(t.reconsent.failed);
      return;
    }
    // The entry screen routes from the fresh row: into the tabs now.
    router.replace('/');
  };

  const remove = async () => {
    if (busyNow.current) return;
    busyNow.current = true;
    setError(null);
    setDeleting(true);
    if (!(await deleteAccount())) {
      busyNow.current = false;
      setDeleting(false);
      setError(t.safety.deleteFailed);
      return;
    }
    signOutAndLeave();
  };

  const busy = saving || deleting;

  return (
    <View style={styles.screen}>
      <CosmicGround planet={false} horizon={false} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding, paddingBottom: bottomGap },
        ]}
        testID="consent-screen"
      >
        <Text style={styles.title} role="heading">
          {t.reconsent.title}
        </Text>
        <Text style={styles.body}>{t.reconsent.body(LEGAL_UPDATED)}</Text>
        <LegalLink
          label={t.onboarding.consentLink}
          style={styles.link}
          testID="consent-read"
        />

        <Pressable
          testID="consent-agree"
          role="checkbox"
          aria-checked={agreed}
          disabled={busy}
          style={styles.agreeRow}
          onPress={() => {
            setError(null);
            setAgreed((on) => !on);
          }}
        >
          <View style={[styles.box, agreed && styles.boxOn]}>
            {agreed ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={styles.agreeText}>{t.reconsent.agree}</Text>
        </Pressable>

        {error ? (
          <Text style={styles.error} testID="consent-error">
            {error}
          </Text>
        ) : null}
        <View style={styles.submit}>
          <GradientButton
            testID="consent-accept"
            label={saving ? t.reconsent.busy : t.reconsent.submit}
            disabled={busy}
            onPress={() => void accept()}
          />
        </View>

        <View style={styles.decline}>
          <Text style={styles.declineTitle}>{t.reconsent.declineTitle}</Text>
          <Text style={styles.hint}>{t.reconsent.decline}</Text>
          <OutlineButton
            testID="consent-sign-out"
            label={t.settings.signOut}
            disabled={busy}
            onPress={signOutAndLeave}
          />
          {confirmingDelete ? (
            <View style={styles.confirm} testID="consent-delete-confirm">
              <Text style={styles.hint}>{t.safety.deleteConfirm}</Text>
              <Pressable
                testID="consent-delete-yes"
                role="button"
                disabled={busy}
                style={({ pressed }) => [
                  styles.confirmDanger,
                  (pressed || busy) && styles.dim,
                ]}
                onPress={() => void remove()}
              >
                <Text style={styles.danger}>
                  {deleting ? t.safety.deleting : t.safety.deleteTitle}
                </Text>
              </Pressable>
              <OutlineButton
                label={t.safety.cancel}
                disabled={busy}
                onPress={() => setConfirmingDelete(false)}
              />
            </View>
          ) : (
            <Pressable
              testID="consent-delete"
              role="button"
              disabled={busy}
              style={({ pressed }) => [
                styles.deleteLink,
                (pressed || busy) && styles.dim,
              ]}
              onPress={() => {
                setError(null);
                setConfirmingDelete(true);
              }}
            >
              <Text style={styles.danger}>{t.safety.deleteAccount}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg,
  },
  content: { padding: 24, gap: 8, maxWidth: 560, width: '100%' },
  title: { color: color.text, fontSize: 26, fontFamily: font.semibold },
  body: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  link: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: color.cool, borderColor: color.cool },
  tick: { color: color.onBright, fontSize: 14, lineHeight: 18 },
  agreeText: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  error: { fontFamily: font.regular, color: color.danger },
  submit: { marginTop: space.md },
  decline: { marginTop: 40, gap: space.sm },
  declineTitle: {
    fontFamily: font.semibold,
    color: color.textMuted,
    fontSize: 14,
  },
  hint: {
    fontFamily: font.regular,
    color: color.textFaint,
    fontSize: 12,
    lineHeight: 18,
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  confirm: { gap: space.sm, marginTop: space.xs },
  confirmDanger: {
    backgroundColor: color.dangerSurface,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  danger: { fontFamily: font.semibold, color: color.danger, fontSize: 15 },
  dim: { opacity: 0.6 },
});
