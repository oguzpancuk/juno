import { Link, router } from 'expo-router';
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
import { authErrorText } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { OrbitMark } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

type Step = { kind: 'email' } | { kind: 'code'; email: string };

export default function SignIn() {
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const target = email.trim().toLowerCase();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (err) {
      setError(authErrorText(err));
      return;
    }
    setStep({ kind: 'code', email: target });
  };

  const verify = async () => {
    if (step.kind !== 'code') return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: step.email,
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (err) {
      setError(authErrorText(err));
      return;
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Link href="/welcome" style={styles.back}>
        {t.signIn.back}
      </Link>
      <View style={styles.mark}>
        <OrbitMark size={72} />
      </View>
      <Text style={styles.title}>{t.signIn.title}</Text>
      {step.kind === 'email' ? (
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
          />
          <Pressable
            testID="send-code"
            style={[
              styles.button,
              (busy || !email.includes('@')) && styles.buttonBusy,
            ]}
            disabled={busy || !email.includes('@')}
            onPress={() => void sendCode()}
          >
            <Text style={styles.buttonText}>
              {busy ? t.signIn.sending : t.signIn.sendCode}
            </Text>
          </Pressable>
          <Text style={styles.consent}>{t.signIn.consent}</Text>
          <Link href="/legal" style={styles.consentLink}>
            {t.legal.open}
          </Link>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>{t.signIn.codeLabel}</Text>
          <TextInput
            testID="code"
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
          />
          <Pressable
            testID="verify"
            style={[
              styles.button,
              (busy || code.trim().length !== 6) && styles.buttonBusy,
            ]}
            disabled={busy || code.trim().length !== 6}
            onPress={() => void verify()}
          >
            <Text style={styles.buttonText}>{t.signIn.verify}</Text>
          </Pressable>
          <Pressable onPress={() => setStep({ kind: 'email' })}>
            <Text style={styles.link}>{t.signIn.resend}</Text>
          </Pressable>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  back: {
    ...type.body,
    color: color.textMuted,
    position: 'absolute',
    top: 64,
    left: space.xl,
  },
  mark: { alignItems: 'center', marginBottom: space.xl },
  brand: {
    ...type.display,
    color: color.text,
    fontSize: 44,
    fontWeight: '300',
    letterSpacing: 6,
    textAlign: 'center',
  },
  tagline: {
    ...type.label,
    color: color.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
    marginBottom: space.xxl,
  },
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
  button: {
    backgroundColor: color.pink,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.55 },
  buttonText: { ...type.heading, color: color.onBright },
  link: {
    ...type.body,
    color: color.textMuted,
    textAlign: 'center',
    paddingVertical: space.md,
  },
  consent: { ...type.bodySmall, color: color.textFaint },
  consentLink: { ...type.bodySmall, color: color.textMuted },
  error: { ...type.body, color: color.danger, marginTop: space.md },
});
