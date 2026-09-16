import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The parts of the app config that depend on a credential.
 *
 * `app.json` stays the base and the readable one — name, icons, the
 * colours `theme/tokens.test.ts` checks against it. This file layers on
 * what cannot be written down in a repository: the Google iOS client, which
 * differs per Google Cloud project and arrives as an environment variable.
 *
 * A build with no `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is a build without the
 * Google plugin, and the app then hides the Google button
 * (`lib/oauth.ts` `availability`). That is deliberate: the alternative is a
 * placeholder URL scheme that prebuilds cleanly and then fails silently at
 * the one moment it matters, when Google tries to return to the app.
 */

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * The reversed client ID, which is what iOS registers as a URL scheme.
 *
 * The same rule as `lib/oauth.ts` `reversedClientId`, which the battery
 * covers; it is repeated rather than imported because this file is
 * evaluated by the Expo CLI outside the app's module graph, and a broken
 * import here fails a build instead of a test. Both derive the scheme from
 * the client ID rather than taking it as a second variable, so the two can
 * never disagree.
 */
function reversedClientId(clientId: string): string {
  if (!/^[\w-]+\.apps\.googleusercontent\.com$/u.test(clientId)) {
    throw new Error(
      `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not a Google client ID: ${clientId}`,
    );
  }
  return `com.googleusercontent.apps.${clientId.split('.apps.googleusercontent.com')[0]}`;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  // `ConfigContext` types these as optional; app.json always has them.
  name: config.name ?? 'Juno',
  slug: config.slug ?? 'juno',
  ios: {
    ...config.ios,
    // The entitlement behind Sign in with Apple. Without it the native
    // sheet refuses to open on a real device.
    usesAppleSignIn: true,
  },
  plugins: [
    ...(config.plugins ?? []),
    'expo-apple-authentication',
    ...(GOOGLE_IOS_CLIENT_ID
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: reversedClientId(GOOGLE_IOS_CLIENT_ID) },
          ] satisfies [string, unknown],
        ]
      : []),
  ],
});
