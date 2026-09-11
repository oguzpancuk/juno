import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { BackLink, LinkText, OrbitMark } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/**
 * One screen for both doors: sign-up and sign-in with an e-mail and a
 * password. The mode arrives as a route param (welcome links to each) and
 * a link at the bottom flips it in place, keeping what was typed.
 *
 * Sign-up gives a session at once because the auth project does not
 * confirm addresses by mail (`supabase/config.toml`, owner 2026-09-11). A
 * project that does answers with no session and no error; that case shows
 * a sentence instead of a spinner that never ends.
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
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    const { data, error: err } =
      mode === 'up'
        ? await supabase.auth.signUp(parsed.value)
        : await supabase.auth.signInWithPassword(parsed.value);
    if (err) {
      setBusy(false);
      setError(authErrorText(err));
      return;
    }
    if (!data.session) {
      // The account exists but the provider wants the address confirmed
      // first (a hosted project with confirmations on). Nothing to wait
      // for here: say so, and leave the form for the sign-in that follows.
      setBusy(false);
      if (mode === 'up') setNotice(t.signUp.confirmSent);
      else setError(t.errors.generic);
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
    setNotice(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Pops, never pushes: a Link here grew the root stack by two
          screens per round trip, and what an edge swipe revealed after
          signing out was that history. */}
      <View style={styles.back}>
        <BackLink label={t.signIn.back} fallback="/welcome" />
      </View>
      <View style={styles.mark}>
        <OrbitMark size={72} />
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
          returnKeyType="next"
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
        <Pressable
          testID="submit"
          style={[styles.button, !canSubmit && styles.buttonBusy]}
          disabled={!canSubmit}
          onPress={() => void submit()}
        >
          <Text style={styles.buttonText}>
            {mode === 'up'
              ? busy
                ? t.signUp.busy
                : t.signUp.submit
              : busy
                ? t.signIn.busy
                : t.signIn.submit}
          </Text>
        </Pressable>
        <Text style={styles.consent}>{t.signIn.consent}</Text>
        <Link href="/legal" style={styles.consentLink}>
          {t.legal.open}
        </Link>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <LinkText testID="flip-mode" style={styles.flip} onPress={flip}>
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
  mark: { alignItems: 'center', marginBottom: space.xl },
  title: { ...type.heading, color: color.textMuted },
  form: { gap: space.md, marginTop: space.md },
  label: { ...type.bodySmall, color: color.textMuted },
  input: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    color: color.text,
    fontSize: 17,
    padding: space.lg,
  },
  hint: { ...type.bodySmall, color: color.textFaint },
  fieldError: { ...type.bodySmall, color: color.danger },
  button: {
    backgroundColor: color.pink,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.55 },
  buttonText: { ...type.heading, color: color.onBright },
  consent: { ...type.bodySmall, color: color.textFaint },
  consentLink: { ...type.bodySmall, color: color.textMuted },
  error: { ...type.body, color: color.danger, marginTop: space.md },
  notice: { ...type.body, color: color.textMuted, marginTop: space.md },
  flip: { textAlign: 'center', marginTop: space.md },
});
