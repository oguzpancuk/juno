import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { CosmicGround } from '@/components/CosmicGround';
import {
  Glow,
  GradientButton,
  LinkText,
  OrbitMark,
  OutlineButton,
} from '@/components/ui';
import { t } from '@/lib/strings';
import { color, font, space, type } from '@/theme/tokens';

/**
 * The door. Everything before this screen is a redirect, so it is the first
 * thing a new person sees: the mark, what the product is for, and the ways
 * in.
 *
 * The filled button opens sign-up; the link under the group opens sign-in
 * for someone who already has an account. Between them sit Apple and
 * Google buttons that do nothing yet. This file used to say that a button
 * that does nothing is worse than none, and kept the door to one way in
 * until Sign in with Apple worked; the owner overrode that on 2026-09-11
 * ("arkası şimdilik boş kalsın") — the placeholders are to be seen now,
 * and the providers are wired under the ROADMAP item "Sign in with Apple".
 * Until then a tap on either is a no-op that logs nothing. The App Store
 * review risk of a non-working Sign in with Apple button is recorded in
 * docs/NOTES.md against the TestFlight item.
 */
/** The mark, and the light behind it — centred on it, so offset by half the difference. */
const MARK = 132;
const GLOW = 300;

export default function WelcomeScreen() {
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
        <Text style={styles.brand}>{t.appName}</Text>
        <Text style={styles.tagline}>{t.signIn.tagline}</Text>
      </View>

      <Text style={styles.pitch}>{t.welcome.pitch}</Text>

      <View style={styles.actions}>
        <GradientButton
          testID="continue-email"
          label={t.welcome.withEmail}
          onPress={() =>
            router.push({ pathname: '/sign-in', params: { mode: 'up' } })
          }
        />
        <OutlineButton
          testID="continue-apple"
          label={t.welcome.withApple}
          // why: owner decision 2026-09-11 — a visible placeholder with
          // nothing behind it; the provider is wired later (ROADMAP "Sign
          // in with Apple"). Deliberately silent: no log, no toast.
          onPress={() => {}}
        />
        <OutlineButton
          testID="continue-google"
          label={t.welcome.withGoogle}
          // why: same owner decision as the Apple button above.
          onPress={() => {}}
        />
        <LinkText
          testID="to-sign-in"
          style={styles.haveAccount}
          onPress={() =>
            router.push({ pathname: '/sign-in', params: { mode: 'in' } })
          }
        >
          {t.welcome.haveAccount}
        </LinkText>
        <Text style={styles.consent}>{t.signIn.consent}</Text>
        <Link href="/legal" style={styles.consentLink}>
          {t.onboarding.consentLink}
        </Link>
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
  hero: { alignItems: 'center', marginTop: 96, gap: space.md },
  glow: { top: -(GLOW - MARK) / 2, left: -(GLOW - MARK) / 2 },
  brand: {
    ...type.display,
    color: color.text,
    fontSize: 46,
    fontFamily: font.light,
    letterSpacing: 7,
  },
  tagline: { ...type.label, color: color.textMuted },
  pitch: {
    ...type.title,
    color: color.text,
    textAlign: 'center',
    lineHeight: 34,
    paddingHorizontal: space.lg,
  },
  actions: { gap: space.md },
  haveAccount: { textAlign: 'center' },
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
