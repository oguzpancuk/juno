import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CosmicGround } from '@/components/CosmicGround';
import {
  Glow,
  GradientButton,
  Wordmark,
  LinkText,
  OrbitMark,
} from '@/components/ui';
import {
  AppleButton,
  AppleWebButton,
  GoogleButton,
} from '@/components/ProviderButtons';
import type { Availability, Provider } from '@/lib/oauth';
import { providerAvailability, signInWithProvider } from '@/lib/providers';
import { LegalLink } from '@/components/LegalText';
import { doorSize } from '@/lib/door-layout';
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
 * (components/ProviderButtons.tsx), and since 2026-09-16 they sign people
 * in rather than stand there — the placeholders the owner asked for on
 * 2026-09-11 ("arkası şimdilik boş kalsın") are gone, and with them the
 * App Store Review 4.8 risk of a Sign in with Apple button a reviewer
 * taps and nothing happens.
 *
 * A provider that cannot work on this build is not drawn at all: Apple
 * where the device does not offer it or, on the web, where no Services ID
 * was compiled in (the web draws its own Apple button, Apple's system one
 * being iOS only), Google where no client ID was compiled in
 * (`lib/oauth.ts` `availability`). Until that answer arrives — one async
 * call on mount — neither is shown, so no button appears and then
 * vanishes under a thumb already on its way down.
 */
/** The light behind the mark, in proportion to it: 300 behind 132. */
const GLOW_PER_MARK = 300 / 132;

export default function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = doorSize(height - insets.top - insets.bottom);
  const glow = Math.round(size.mark * GLOW_PER_MARK);
  // Whether the door is taller than its page, and scrolls. The horizon is
  // fixed to the page's bottom edge, so on a door that runs past it the
  // curve would cross whatever text sits there at rest; it goes, and the
  // scroll indicator says there is more below.
  const [page, setPage] = useState(0);
  const [content, setContent] = useState(0);
  const scrolls = page > 0 && content > page + 1;
  // iOS keeps a scroll indicator hidden until someone scrolls; flashed
  // once, it says so before they have to guess.
  const scroller = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrolls) scroller.current?.flashScrollIndicators();
  }, [scrolls]);
  const [providers, setProviders] = useState<Availability>({
    apple: false,
    google: false,
  });
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On the web a provider button leaves the page busy, because the tab is
  // on its way to the provider. Back from Apple's or Google's page, a
  // browser that restores this page from its back-forward cache (Safari
  // on iOS does readily) restores that state too, and both buttons would
  // sit dimmed on "Bağlanıyor…" until a reload.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(null);
    };
    globalThis.addEventListener('pageshow', restored);
    return () => globalThis.removeEventListener('pageshow', restored);
  }, []);

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
      <CosmicGround
        planet={false}
        horizon={!scrolls}
        horizonRise={size.horizonRise}
      />
      <ScrollView
        ref={scroller}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + size.top,
            // On the phone the home indicator's strip already holds part
            // of the clearance; in a browser the inset is zero.
            paddingBottom: Math.max(insets.bottom + space.lg, size.bottom),
          },
        ]}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={scrolls}
        onLayout={({ nativeEvent }) => setPage(nativeEvent.layout.height)}
        onContentSizeChange={(_, height) => setContent(height)}
      >
        <View style={styles.aboveHero} />
        <View style={[styles.hero, { gap: size.gap }]}>
          <View>
            <Glow
              size={glow}
              style={{
                top: -(glow - size.mark) / 2,
                left: -(glow - size.mark) / 2,
              }}
            />
            <OrbitMark size={size.mark} />
          </View>
          <Wordmark size={size.wordmark} />
          <Text style={styles.tagline}>{t.signIn.tagline}</Text>
        </View>
        <View style={styles.between} />
        <Text style={[styles.pitch, { lineHeight: size.leading }]}>
          {t.welcome.pitch}
        </Text>
        <View style={styles.between} />

        <View style={styles.actions}>
          <GradientButton
            testID="continue-email"
            label={t.welcome.withEmail}
            onPress={() =>
              router.push({ pathname: '/sign-in', params: { mode: 'in' } })
            }
          />
          {providers.apple && Platform.OS === 'web' ? (
            <AppleWebButton
              label={
                busy === 'apple' ? t.welcome.connecting : t.welcome.withApple
              }
              disabled={busy !== null}
              onPress={() => void startProvider('apple')}
            />
          ) : providers.apple ? (
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
        </View>
        <View style={[styles.after, { gap: size.gap }]}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  // A column the height of the screen when the door fits, taller when it
  // does not; the spacers share what is left over, the drop above the
  // mark taking twice what each gap below takes.
  content: { flexGrow: 1, paddingHorizontal: space.xl },
  aboveHero: { flexGrow: 2, minHeight: space.sm },
  between: { flexGrow: 1, minHeight: space.lg },
  hero: { alignItems: 'center' },
  tagline: { ...type.label, color: color.textMuted },
  pitch: {
    ...type.title,
    color: color.text,
    textAlign: 'center',
    lineHeight: 34,
    paddingHorizontal: space.lg,
  },
  actions: { gap: space.md },
  after: { marginTop: space.md },
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
