import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MAX_LABEL_SCALE } from '@/components/ui';
import { appleBrand, googleBrand, space } from '@/theme/tokens';

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
 * `AppleAuthentication.isAvailableAsync()` said yes — iOS. The web
 * draws `AppleWebButton` in its place.
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
 * Sign in with Apple on the web, where the system button does not exist.
 *
 * Apple's guidelines allow a button drawn by the app when it keeps to
 * three things, and this keeps to all of them: the Apple logo as Apple
 * publishes it (left of the title, the height of its capitals), a title
 * Apple approves in the platform's font — "Apple ile Giriş Yap", Apple's
 * own Turkish name for the feature — and one of the approved colour
 * sets, white with black for this dark screen, the same one the iPhone
 * button uses. Same height and corners as the buttons around it. Being
 * the app's own drawing, it can say "Bağlanıyor…" while the tab leaves
 * for Apple's page, as Google's does.
 */
export function AppleWebButton({
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
      testID="continue-apple"
      role="button"
      // The label alone: the logo is drawn, not said.
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.appleWeb,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <AppleLogo />
      <Text style={styles.appleText} maxFontSizeMultiplier={MAX_LABEL_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The Apple logo, solid, in a 24-unit box. */
function AppleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill={appleBrand.ink}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </Svg>
  );
}

/**
 * Google's light button, per its sign-in branding guidelines: white fill,
 * a grey hairline, near-black text, and the standard four-colour "G" at
 * its own colours, never recoloured (`googleBrand` in theme/tokens.ts).
 * The guidelines set the title in Roboto Medium 14; this app does not
 * bundle Roboto (a new dependency), so the title uses the platform's
 * system font at medium weight, and at 17 rather than 14, to sit beside
 * the 18-point e-mail button.
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
  appleWeb: {
    minHeight: PROVIDER_BUTTON_HEIGHT,
    borderRadius: PROVIDER_BUTTON_HEIGHT / 2,
    backgroundColor: appleBrand.fill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  appleText: {
    color: appleBrand.ink,
    fontSize: 17,
    fontWeight: '500',
  },
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
