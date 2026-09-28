import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MAX_LABEL_SCALE } from '@/components/ui';
import { googleBrand, space } from '@/theme/tokens';

/**
 * The Apple and Google buttons on the welcome screen, drawn the way each
 * provider's own rules ask (owner, 2026-09-28: "logoları UI'a uygun
 * şekilde butonlara koyalım").
 *
 * Both are white pills on this dark screen, the same height as the
 * e-mail button above them, so the three read as one stack while each
 * keeps the look its provider requires.
 */

/** The e-mail button's height: `type.heading`'s 24 line plus 16 on each side. */
export const PROVIDER_BUTTON_HEIGHT = 56;

/**
 * Apple's own button (`ASAuthorizationAppleIDButton`), not a drawing of
 * one. Apple's Human Interface Guidelines allow a custom button only with
 * its logo asset, an approved title in the system font and approved
 * colours; the system button is all of that by construction. It titles
 * itself in a language the app bundle declares, which is why app.json
 * declares Turkish (`lib/app-config.test.ts`): with nothing declared the
 * bundle is English-only and the title reads "Sign in with Apple". White is
 * the style the guidelines give for a dark background. Its title cannot
 * be changed, so while a sign-in runs it dims and stops taking taps
 * instead of saying "Bağlanıyor…". It is drawn only where
 * `AppleAuthentication.isAvailableAsync()` said yes — iOS.
 */
export function AppleButton({
  busy,
  disabled,
  onPress,
}: {
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View
      testID="continue-apple"
      pointerEvents={disabled ? 'none' : 'auto'}
      style={(busy || disabled) && styles.dim}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={PROVIDER_BUTTON_HEIGHT / 2}
        style={styles.apple}
        onPress={onPress}
      />
    </View>
  );
}

/**
 * Google's light button, per its sign-in branding guidelines: white fill,
 * a grey hairline, near-black text, and the standard four-colour "G" at
 * its own colours, never recoloured (`googleBrand` in theme/tokens.ts).
 * The guidelines set the title in Roboto Medium; this app does not bundle Roboto (a new dependency), so
 * the title uses the platform's system font at medium weight, and at 17
 * rather than the spec's 14, to sit beside the 18-point e-mail button.
 */
export function GoogleButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID="continue-google"
      role="button"
      // The label alone: the logo is drawn, not said.
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.google,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <GoogleLogo />
      <Text style={styles.googleText} maxFontSizeMultiplier={MAX_LABEL_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The "G" as Google publishes it for sign-in buttons (48-unit box). */
function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill={googleBrand.red}
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill={googleBrand.blue}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill={googleBrand.yellow}
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill={googleBrand.green}
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.6 },
  apple: { width: '100%', height: PROVIDER_BUTTON_HEIGHT },
  google: {
    minHeight: PROVIDER_BUTTON_HEIGHT,
    borderRadius: PROVIDER_BUTTON_HEIGHT / 2,
    borderWidth: 1,
    borderColor: googleBrand.stroke,
    backgroundColor: googleBrand.fill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  googleText: {
    color: googleBrand.text,
    fontSize: 17,
    fontWeight: '500',
    // The platform's own face: see the doc comment above.
    fontFamily: Platform.select({ ios: 'System', default: undefined }),
  },
});
