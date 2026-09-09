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
import { t } from '@/lib/strings';

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
      <Text style={styles.brand}>{t.appName}</Text>
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
            placeholderTextColor="#5f5a7a"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Pressable
            testID="send-code"
            style={[styles.button, busy && styles.buttonBusy]}
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
            style={[styles.button, busy && styles.buttonBusy]}
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
    backgroundColor: '#0b0b1a',
    padding: 24,
    justifyContent: 'center',
    gap: 8,
  },
  brand: {
    color: '#f5f2ff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: { color: '#9a94b8', fontSize: 16, marginBottom: 16 },
  form: { gap: 12 },
  label: { color: '#c9c4e3', fontSize: 14 },
  input: {
    backgroundColor: '#15142a',
    color: '#f5f2ff',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
  },
  button: {
    backgroundColor: '#7c6cff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  link: { color: '#9a94b8', textAlign: 'center', marginTop: 8 },
  consent: { color: '#5f5a7a', fontSize: 12, marginTop: 8 },
  consentLink: { color: '#9a94b8', fontSize: 12, marginTop: 4 },
  error: { color: '#ff7b7b', marginTop: 12 },
});
