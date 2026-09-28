import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CosmicGround } from '@/components/CosmicGround';
import {
  Glow,
  GradientButton,
  Wordmark,
  LinkText,
  OrbitMark,
} from '@/components/ui';
import { AppleButton, GoogleButton } from '@/components/ProviderButtons';
import type { Availability, Provider } from '@/lib/oauth';
import { providerAvailability, signInWithProvider } from '@/lib/providers';
import { LegalLink } from '@/components/LegalText';
import { t } from '@/lib/strings';
import { color, space, type } from '@/theme/tokens';

/**
 * The door. Everything before this screen is a redirect, so it is the first
 * thing a new person sees: the mark, what the product is for, and the ways
 * in.
 *
 * The filled button, first, opens the e-mail sign-in; the link under the
 * group opens sign-up for someone who has no account yet (owner,
 * 2026-09-28, after trying both providers on a device). Between them sit
 * Apple and Google, each drawn as its provider requires
 * (components/ProviderButtons.tsx), and since 2026-09-16 they sign people in rather than stand there
 * — the placeholders the owner asked for on 2026-09-11 ("arkası şimdilik
 * boş kalsın") are gone, and with them the App Store Review 4.8 risk of a
 * Sign in with Apple button a reviewer taps and nothing happens.
 *
 * A provider that cannot work on this build is not drawn at all: Apple
 * where the device does not offer it, Google where no client ID was
 * compiled in (`lib/oauth.ts` `availability`). Until that answer arrives —
 * one async call on mount — neither is shown, so no button appears and
 * then vanishes under a thumb already on its way down.
 */
/** The mark, and the light behind it — centred on it, so offset by half the difference. */
const MARK = 132;
const GLOW = 300;

export default function WelcomeScreen() {
  const [providers, setProviders] = useState<Availability>({
    apple: false,
    google: false,
  });
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void providerAvailability().then((available) => {
      if (!cancelled) setProviders(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startProvider = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    const outcome = await signInWithProvider(provider);
    if (outcome.status === 'signed-in') {
      // `/` routes on from here: onboarding for a new account, the tabs
      // for one that already has a profile. Busy stays on, the screen is
      // leaving. A replace, not a push — welcome is where signing out
      // lands, and it must not be sitting under the tab bar.
      router.replace('/');
      return;
    }
    // A redirect has already taken the tab; there is nothing left to draw.
    if (outcome.status === 'redirected') return;
    setBusy(null);
    if (outcome.status === 'failed') setError(outcome.message);
  };

  return (
    <View style={styles.screen} testID="welcome-screen">
      {/* Stars and the horizon; no planet, the mark has the top, and the
          curve stays under the legal link rather than through it. */}
      <CosmicGround planet={false} horizonRise={0.05} />
      <View style={styles.hero}>
        <View>
          <Glow size={GLOW} style={styles.glow} />
          <OrbitMark size={MARK} />
        </View>
        <Wordmark />
        <Text style={styles.tagline}>{t.signIn.tagline}</Text>
      </View>

      <Text style={styles.pitch}>{t.welcome.pitch}</Text>

      <View style={styles.actions}>
        <GradientButton
          testID="continue-email"
          label={t.welcome.withEmail}
          onPress={() =>
            router.push({ pathname: '/sign-in', params: { mode: 'in' } })
          }
        />
        {providers.apple ? (
          <AppleButton
            busy={busy === 'apple'}
            disabled={busy !== null}
            onPress={() => void startProvider('apple')}
          />
        ) : null}
        {providers.google ? (
          <GoogleButton
            label={
              busy === 'google' ? t.welcome.connecting : t.welcome.withGoogle
            }
            disabled={busy !== null}
            onPress={() => void startProvider('google')}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <LinkText
          testID="to-sign-up"
          style={styles.noAccount}
          onPress={() =>
            router.push({ pathname: '/sign-in', params: { mode: 'up' } })
          }
        >
          {t.signIn.toSignUp}
        </LinkText>
        <Text style={styles.consent}>{t.signIn.consent}</Text>
        <LegalLink
          label={t.onboarding.consentLink}
          style={styles.consentLink}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    padding: space.xl,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  // A flat drop, unlike every other screen's clearance.
  //
  // It was briefly `useTopClearance(76)` and that was scope creep: the
  // owner never listed this screen, and a review found the cost. The
  // drop is in flow in a plain `space-between` View with no scroll — the
  // doors have no scroll either, but their clearance goes to an absolutely
  // positioned back link and takes no room — so on a device the extra
  // inset comes straight out of the bottom, where the consent line and the
  // legal link are, with nothing to recover them at a large text size.
  // Left alone until there is a reason to touch it.
  hero: { alignItems: 'center', marginTop: 96, gap: space.md },
  glow: { top: -(GLOW - MARK) / 2, left: -(GLOW - MARK) / 2 },
  tagline: { ...type.label, color: color.textMuted },
  pitch: {
    ...type.title,
    color: color.text,
    textAlign: 'center',
    lineHeight: 34,
    paddingHorizontal: space.lg,
  },
  actions: { gap: space.md },
  error: { ...type.bodySmall, color: color.danger, textAlign: 'center' },
  noAccount: { textAlign: 'center' },
  consent: {
    ...type.bodySmall,
    color: color.textFaint,
    textAlign: 'center',
  },
  consentLink: {
    ...type.bodySmall,
    color: color.textMuted,
    textAlign: 'center',
  },
});
