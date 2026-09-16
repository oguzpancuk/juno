import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';
import { authErrorText } from '@/lib/errors';
import {
  OTP_LENGTH,
  isCompleteOtp,
  normalizeOtp,
  resendSecondsLeft,
} from '@/lib/otp';
import { supabase } from '@/lib/supabase';
import { BackLink, GradientButton, LinkText, OrbitMark } from '@/components/ui';
import { CosmicGround } from '@/components/CosmicGround';
import { t } from '@/lib/strings';
import { color, font, glass, radius, space, type } from '@/theme/tokens';

/**
 * The step between a sign-up and a session.
 *
 * With `[auth.email] enable_confirmations` on (owner, 2026-09-16), `signUp`
 * returns a user and no session, and GoTrue mails a six-digit code. This
 * screen is where that code is spent: `verifyOtp({ type: 'signup' })`
 * confirms the address and answers with the session the sign-up did not
 * give.
 *
 * The address arrives as a route param and nothing else does — a password
 * must not sit in a URL, and this screen has no use for one. The mail is
 * already on its way when the screen opens (the sign-up sent it), so the
 * resend link starts available rather than counting down from a send this
 * screen did not make; `?resend=1` is the other door in, from a sign-in
 * that was refused with `email_not_confirmed`, and it asks for a fresh
 * code on arrival because the old one is long gone.
 */

const emailParamSchema = z.string().trim().toLowerCase().email();

export default function Verify() {
  const params = useLocalSearchParams<{ email?: string; resend?: string }>();
  const parsedEmail = emailParamSchema.safeParse(params.email ?? '');
  const email = parsedEmail.success ? parsedEmail.data : null;
  const wantsFreshCode = params.resend === '1';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The clock starts at mount, not at the first tap: the sign-up one
  // screen back has just sent a mail, and the server's `max_frequency` is
  // already counting against it — a resend link bright on arrival only
  // buys a rate-limit sentence. Both are state read in an initialiser, not
  // a `Date.now()` in the render body, which would give a different answer
  // every time React happened to run it.
  const [sentAt, setSentAt] = useState<number | null>(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  const secondsLeft = resendSecondsLeft(sentAt, now);
  const cooling = secondsLeft > 0;

  // Twice a second, so the number shown is never more than half a second
  // stale, and so a countdown that stalled in the background catches up on
  // the next tick rather than counting from where it stopped.
  useEffect(() => {
    if (!cooling) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooling]);

  const sendCode = useCallback(async () => {
    if (!email) return;
    setSending(true);
    setError(null);
    setNotice(null);
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setSending(false);
    if (err) {
      setError(authErrorText(err));
      return;
    }
    // Only a send that happened starts the countdown: a refused one leaves
    // the link as it was, because the person has nothing new to wait for.
    const sent = Date.now();
    setSentAt(sent);
    setNow(sent);
    setNotice(t.verify.resent);
  }, [email]);

  // The sign-in door's arrival: ask for a code once, for this address.
  const asked = useRef(false);
  useEffect(() => {
    if (!wantsFreshCode || asked.current || !email) return;
    asked.current = true;
    void sendCode();
  }, [wantsFreshCode, email, sendCode]);

  // A screen opened without a usable address cannot verify anything — a
  // mistyped deep link, or a param lost in a reload. Back to the door.
  if (!email) return <Redirect href="/sign-in" />;

  const submit = async () => {
    if (!isCompleteOtp(code)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: err } = await supabase.auth.verifyOtp({
      email,
      token: normalizeOtp(code),
      type: 'signup',
    });
    if (err) {
      setBusy(false);
      setError(authErrorText(err));
      return;
    }
    if (!data.session) {
      // Not a case GoTrue is known to produce — a verified code is a
      // session — but a screen that spins for ever is the worse failure.
      setBusy(false);
      setError(t.errors.generic);
      return;
    }
    // Busy stays on: the screen is leaving. Same exit as sign-in — the
    // root stack is popped so `/` replaces the door rather than sitting on
    // top of it, and an edge swipe afterwards reveals nothing.
    if (router.canGoBack()) router.dismissAll();
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <CosmicGround planet={false} horizon={false} />
      <View style={styles.back}>
        <BackLink label={t.verify.back} fallback="/welcome" />
      </View>
      <View style={styles.mark}>
        <OrbitMark size={72} />
      </View>
      <Text style={styles.title}>{t.verify.title}</Text>
      <Text style={styles.subtitle}>{t.verify.subtitle(email)}</Text>
      <View style={styles.form}>
        <Text style={styles.label}>{t.verify.label}</Text>
        <TextInput
          testID="code"
          style={styles.input}
          value={code}
          // Normalised on the way in, so a pasted "123 456" is a code and
          // a seventh digit is not typed over the first six.
          onChangeText={(raw) => setCode(normalizeOtp(raw))}
          placeholder={t.verify.placeholder}
          placeholderTextColor={color.textFaint}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          // Offers the code straight from the mail on iOS.
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => {
            if (isCompleteOtp(code) && !busy) void submit();
          }}
        />
        <Text style={styles.hint}>{t.verify.spamHint}</Text>
        <GradientButton
          testID="submit-code"
          label={busy ? t.verify.busy : t.verify.submit}
          disabled={!isCompleteOtp(code) || busy}
          onPress={() => void submit()}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <LinkText
        testID="resend-code"
        style={styles.resend}
        {...(cooling || sending || busy
          ? {}
          : { onPress: () => void sendCode() })}
      >
        {secondsLeft > 0 ? t.verify.resendIn(secondsLeft) : t.verify.resend}
      </LinkText>
      <Text style={styles.wrong}>{t.verify.wrongAddress}</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    padding: space.xl,
    justifyContent: 'center',
    gap: space.sm,
  },
  back: { position: 'absolute', top: 56, left: space.xl },
  mark: { alignItems: 'center', marginBottom: space.lg },
  title: { ...type.heading, color: color.textMuted },
  subtitle: { ...type.bodySmall, color: color.textFaint },
  form: { gap: space.md, marginTop: space.md },
  label: { ...type.bodySmall, color: color.textMuted },
  input: {
    fontFamily: font.regular,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.edge,
    borderRadius: radius.md,
    color: color.text,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    padding: space.lg,
  },
  hint: { ...type.bodySmall, color: color.textFaint },
  error: { ...type.body, color: color.danger, marginTop: space.md },
  notice: { ...type.body, color: color.textMuted, marginTop: space.md },
  resend: { textAlign: 'center', marginTop: space.md },
  wrong: {
    ...type.bodySmall,
    color: color.textFaint,
    textAlign: 'center',
    marginTop: space.xs,
  },
});
