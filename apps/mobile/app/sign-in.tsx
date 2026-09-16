import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  modeParamSchema,
  parseCredentials,
  type AuthMode,
} from '@/lib/auth';
import { authErrorText } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import {
  BackLink,
  GradientButton,
  LinkText,
  OrbitMark,
  Wordmark,
} from '@/components/ui';
import { CosmicGround } from '@/components/CosmicGround';
import { t } from '@/lib/strings';
import { color, font, glass, radius, space, type } from '@/theme/tokens';

/**
 * One screen for both doors: sign-up and sign-in with an e-mail and a
 * password. The mode arrives as a route param (welcome links to each) and
 * a link at the bottom flips it in place, keeping what was typed.
 *
 * Neither door ends here any more. Sign-up answers with a user and no
 * session — the project confirms addresses by mail (`supabase/config.toml`
 * `enable_confirmations`, owner 2026-09-16) — so it hands on to
 * `/verify`, where the mailed code is spent. Sign-in on an address that
 * was never confirmed is refused with `email_not_confirmed`, and goes to
 * the same screen with `?resend=1` so a fresh code is on its way before
 * the person has read the sentence.
 */
export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  // Read once: welcome pushes a fresh instance per tap, and the flip link
  // below is the only other way the mode changes.
  const [mode, setMode] = useState<AuthMode>(() =>
    modeParamSchema.parse(params.mode),
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseCredentials({ email, password });
  const canSubmit = parsed.ok && !busy;
  // A field's own sentence appears once there is something in it to be
  // wrong; an empty form is not yet a mistake.
  const emailHint =
    email.length > 0 && !parsed.ok && parsed.field === 'email'
      ? t.signUp.errors.email
      : null;
  const passwordHint =
    password.length > 0 && !parsed.ok && parsed.field === 'password'
      ? t.signUp.errors.password(PASSWORD_MIN, PASSWORD_MAX)
      : null;

  const submit = async () => {
    if (!parsed.ok) return;
    setBusy(true);
    setError(null);
    const { data, error: err } =
      mode === 'up'
        ? await supabase.auth.signUp(parsed.value)
        : await supabase.auth.signInWithPassword(parsed.value);
    if (err) {
      // An account whose address was never confirmed: the code screen is
      // where it is finished, and it asks for a fresh code on arrival.
      // This is a push, not a dismiss — the form is still behind it and
      // must be usable if the person comes back, so busy goes off.
      if (err.code === 'email_not_confirmed') {
        router.push({
          pathname: '/verify',
          params: { email: parsed.value.email, resend: '1' },
        });
        setBusy(false);
        return;
      }
      setBusy(false);
      setError(authErrorText(err));
      return;
    }
    if (!data.session) {
      // Sign-up, every time: GoTrue has mailed a six-digit code and given
      // no session. `/verify` trades one for the other. A sign-in with no
      // session and no error is not a case GoTrue produces; it would leave
      // a spinner running for ever, so it reads as a failure instead.
      if (mode === 'up') {
        router.push({
          pathname: '/verify',
          params: { email: parsed.value.email },
        });
        setBusy(false);
        return;
      }
      setBusy(false);
      setError(t.errors.generic);
      return;
    }
    // Busy stays on: the screen is leaving. The dismiss pops the root stack
    // to welcome so `/` replaces the door rather than sitting on top of it,
    // and nothing is left under the tab group for an edge swipe or Android
    // back to reveal. Welcome and this screen are root routes, so the
    // POP_TO_TOP has a navigator to land on; `/` then routes to onboarding
    // or the tabs. One call into the tab tree — never a second one here.
    if (router.canGoBack()) router.dismissAll();
    router.replace('/');
  };

  const flip = () => {
    setMode(mode === 'up' ? 'in' : 'up');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <CosmicGround planet={false} horizon={false} />
      {/* Pops, never pushes: a Link here grew the root stack by two
          screens per round trip, and what an edge swipe revealed after
          signing out was that history. */}
      <View style={styles.back}>
        <BackLink label={t.signIn.back} fallback="/welcome" />
      </View>
      <View style={styles.mark}>
        <OrbitMark size={88} />
        <Wordmark size={30} />
      </View>
      <Text style={styles.title}>
        {mode === 'up' ? t.signUp.title : t.signIn.title}
      </Text>
      <View style={styles.form}>
        <Text style={styles.label}>{t.signIn.emailLabel}</Text>
        <TextInput
          testID="email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t.signIn.emailPlaceholder}
          placeholderTextColor={color.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />
        {emailHint ? <Text style={styles.fieldError}>{emailHint}</Text> : null}
        <Text style={styles.label}>{t.signIn.passwordLabel}</Text>
        <TextInput
          testID="password"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          // Tells the keychain whether to offer a saved password or to
          // generate one.
          textContentType={mode === 'up' ? 'newPassword' : 'password'}
          autoComplete={mode === 'up' ? 'new-password' : 'password'}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (canSubmit) void submit();
          }}
        />
        {passwordHint ? (
          <Text style={styles.fieldError}>{passwordHint}</Text>
        ) : mode === 'up' ? (
          <Text style={styles.hint}>{t.signUp.passwordHint(PASSWORD_MIN)}</Text>
        ) : null}
        <GradientButton
          testID="submit"
          label={
            mode === 'up'
              ? busy
                ? t.signUp.busy
                : t.signUp.submit
              : busy
                ? t.signIn.busy
                : t.signIn.submit
          }
          disabled={!canSubmit}
          onPress={() => void submit()}
        />
        <Text style={styles.consent}>{t.signIn.consent}</Text>
        <Link href="/legal" style={styles.consentLink}>
          {t.legal.open}
        </Link>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {/* Not while a request is in flight: its answer would land under
          the other mode's title. */}
      <LinkText
        testID="flip-mode"
        style={styles.flip}
        {...(busy ? {} : { onPress: flip })}
      >
        {mode === 'up' ? t.signUp.toSignIn : t.signIn.toSignUp}
      </LinkText>
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
  mark: { alignItems: 'center', marginBottom: space.xl, gap: space.xs },
  title: { ...type.heading, color: color.textMuted },
  form: { gap: space.md, marginTop: space.md },
  label: { ...type.bodySmall, color: color.textMuted },
  input: {
    fontFamily: font.regular,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.edge,
    borderRadius: radius.md,
    color: color.text,
    fontSize: 17,
    padding: space.lg,
  },
  hint: { ...type.bodySmall, color: color.textFaint },
  fieldError: { ...type.bodySmall, color: color.danger },
  consent: { ...type.bodySmall, color: color.textFaint },
  consentLink: { ...type.bodySmall, color: color.textMuted },
  error: { ...type.body, color: color.danger, marginTop: space.md },
  flip: { textAlign: 'center', marginTop: space.md },
});
