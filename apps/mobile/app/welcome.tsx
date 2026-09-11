import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { GradientButton, OrbitMark } from '@/components/ui';
import { t } from '@/lib/strings';
import { color, space, type } from '@/theme/tokens';

/**
 * The door. Everything before this screen is a redirect, so it is the first
 * thing a new person sees: the mark, what the product is for, and one way
 * in.
 *
 * One way in on purpose. Sign in with Apple is a v1 ROADMAP item that
 * needs a real device to test, so it is not offered here until it works —
 * a button that does nothing is worse than a button that is not there. It
 * slots in above the e-mail one when that item lands.
 */
export default function WelcomeScreen() {
  return (
    <View style={styles.screen} testID="welcome-screen">
      <View style={styles.hero}>
        <OrbitMark size={132} />
        <Text style={styles.brand}>{t.appName}</Text>
        <Text style={styles.tagline}>{t.signIn.tagline}</Text>
      </View>

      <Text style={styles.pitch}>{t.welcome.pitch}</Text>

      <View style={styles.actions}>
        <GradientButton
          testID="continue-email"
          label={t.welcome.withEmail}
          onPress={() => router.push('/sign-in')}
        />
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
  brand: {
    ...type.display,
    color: color.text,
    fontSize: 46,
    fontWeight: '300',
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
