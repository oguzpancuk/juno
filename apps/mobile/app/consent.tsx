import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { CosmicGround } from '@/components/CosmicGround';
import { DeleteAccountConfirm } from '@/components/DeleteAccountConfirm';
import { LegalLink } from '@/components/LegalText';
import {
  GradientButton,
  OutlineButton,
  SCREEN_TOP_GUTTER,
} from '@/components/ui';
import {
  acceptCurrentNotice,
  isConsentKnownAsking,
  readConsent,
} from '@/lib/consent';
import { returnPath } from '@/lib/consent-rules';
import { useBottomGap, useTopClearance } from '@/lib/insets';
import { useLanguage } from '@/lib/language';
import { LEGAL_UPDATED_IN } from '@/lib/legal';
import { deleteAccount } from '@/lib/safety';
import { RedirectToSignIn, signOutAndLeave, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, font, space } from '@/theme/tokens';

/**
 * Re-consent (KVKK). A member whose record names an older privacy notice
 * lands here from the entry screen or from the tabs' gate
 * (`lib/consent.ts`), and nothing else opens until they choose: accept
 * the current text, delete the account, or sign out and be asked again
 * next time. Accepting returns to where the gate stopped them
 * (`?next=`, `returnPath`), so a chat opened from a link opens.
 *
 * The same box as onboarding's (`ConsentCheckbox`), the full text one tap
 * away in a popup, because it is the same act. The sentence beside the
 * box differs: onboarding names the two purposes it starts, this one
 * accepts the text as it now stands, whatever changed in it.
 *
 * Deleting is offered here and not only in settings, because settings is
 * behind this screen: without it, the one way to withdraw consent the
 * notice promises would be unreachable to exactly the person who wants
 * it. The confirmation is settings' own (`DeleteAccountConfirm`).
 *
 * Reachable by URL, so it reads the record first, unless the gate or the
 * entry screen has just read it as older: no profile yet goes to
 * onboarding, which records the current version itself; a record already
 * current goes on. Only an older record, or one that cannot be read, is
 * shown the form — accepting over an unreadable one says so if it fails.
 */
export default function Consent() {
  const session = useSession();
  // The notice's date as the language on screen writes it.
  const { language } = useLanguage();
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const topPadding = useTopClearance(SCREEN_TOP_GUTTER);
  const bottomGap = useBottomGap(32);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // A ref, not the rendered state: two taps in one frame both read the
  // state from before either landed.
  const busyNow = useRef(false);

  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const target = returnPath(next);
  // Settled once, when the screen mounts: the gate or the entry screen
  // read the record as older a moment ago, so the form shows at once.
  // Rendering follows `record` alone; accepting takes the member out of
  // the asking set before this screen unmounts, and the form must not
  // turn back into a spinner then (review of #19, round 3).
  const [record, setRecord] = useState<'reading' | 'shown'>(() =>
    userId !== null && isConsentKnownAsking(userId) ? 'shown' : 'reading',
  );

  useEffect(() => {
    if (!userId || record === 'shown') return;
    let cancelled = false;
    void readConsent(userId).then((read) => {
      if (cancelled) return;
      if (read === 'missing') router.replace('/onboarding');
      // The same call as accepting's, so a chat has its list beneath it.
      else if (read === 'current') router.replace(target, { withAnchor: true });
      else setRecord('shown');
    });
    return () => {
      cancelled = true;
    };
    // why: `target` and `record` are read once, with the record: the
    // param does not change under a mounted screen, and `record` only
    // ever moves to 'shown', after which there is nothing to read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (session.status === 'signed-out') return <RedirectToSignIn />;
  if (userId === null || record === 'reading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }

  const accept = async () => {
    if (busyNow.current) return;
    if (!agreed) {
      setError(t.onboarding.errors.consent);
      return;
    }
    busyNow.current = true;
    setError(null);
    setSaving(true);
    // `acceptCurrentNotice` answers false on a throw as well, so this
    // screen is never left locked on "Kaydediliyor…".
    if (!(await acceptCurrentNotice(userId))) {
      busyNow.current = false;
      setSaving(false);
      setError(t.reconsent.failed);
      return;
    }
    // ONE router call into the tab tree (app/onboarding.tsx), straight
    // to where the member was going; the anchor seats that tab's list
    // beneath a chat or a match.
    router.replace(target, { withAnchor: true });
  };

  const remove = async () => {
    if (busyNow.current) return;
    busyNow.current = true;
    setError(null);
    setDeleting(true);
    const ok = await deleteAccount().catch(() => false);
    if (!ok) {
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
        <Text style={styles.body}>
          {t.reconsent.body(LEGAL_UPDATED_IN[language])}
        </Text>
        <LegalLink
          label={t.onboarding.consentLink}
          style={styles.link}
          testID="consent-read"
        />

        <View style={styles.agree}>
          <ConsentCheckbox
            testID="consent-agree"
            checked={agreed}
            disabled={busy}
            onToggle={() => {
              setError(null);
              setAgreed((on) => !on);
            }}
            label={t.reconsent.agree}
          />
        </View>

        {error ? (
          <Text style={styles.error} testID="consent-error" role="alert">
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
            <View style={styles.confirm}>
              <DeleteAccountConfirm
                testIDPrefix="consent-"
                deleting={deleting}
                disabled={busy}
                onConfirm={() => void remove()}
                onCancel={() => setConfirmingDelete(false)}
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
  agree: { marginTop: 20 },
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
  confirm: { marginTop: space.xs },
  danger: { fontFamily: font.semibold, color: color.danger, fontSize: 15 },
  dim: { opacity: 0.6 },
});
