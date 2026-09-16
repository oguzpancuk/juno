import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { env } from './env';
import {
  availability,
  type Availability,
  type Provider,
  type ProviderOutcome,
} from './oauth';
import { t } from './strings';
import { supabase } from './supabase';

/**
 * Apple and Google, on a phone.
 *
 * Both go through the provider's own SDK rather than a browser: the sheet
 * is the system's, Face ID finishes it, and what comes back is an ID token
 * that Supabase exchanges for a session (`signInWithIdToken`). Nothing is
 * redirected anywhere, so no deep link or URL allow-list is in the path.
 *
 * `lib/providers.web.ts` is the same three exports for the web client,
 * where these two modules do not exist; Metro picks between them by
 * filename and TypeScript resolves this one. Neither can be imported by
 * the battery, which is why everything decidable off-device lives in
 * `lib/oauth.ts`.
 */

// Once per app run, and only when there is something to configure with.
// The library throws on `signIn` if `configure` never ran; a build with no
// client ID never shows the button that would call it.
if (env.googleWebClientId) {
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    ...(env.googleIosClientId ? { iosClientId: env.googleIosClientId } : {}),
    // The address is the whole point — it is what Supabase keys the
    // account on. The profile scope is Google's default and carries the
    // name and picture, which this product asks for itself in onboarding.
    scopes: ['email'],
  });
}

/** Which buttons this device may show. Apple's half is a device question. */
export async function providerAvailability(): Promise<Availability> {
  const appleNative =
    Platform.OS === 'ios'
      ? await AppleAuthentication.isAvailableAsync()
      : false;
  return availability({
    platform: Platform.OS,
    appleNative,
    googleConfigured: env.googleWebClientId !== undefined,
  });
}

/** The person closed the sheet. An answer, not a failure. */
function cancelled(error: unknown): boolean {
  if (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  ) {
    return true;
  }
  return isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED;
}

async function appleToken(): Promise<string | null> {
  const credential = await AppleAuthentication.signInAsync({
    // Only the address. Apple returns the full name once and only on the
    // very first authorisation, so a product that stored it would have a
    // name for some accounts and not others; onboarding asks everyone.
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  return credential.identityToken;
}

async function googleToken(): Promise<string | null> {
  // Android's Google Play services may be missing or out of date; on iOS
  // this resolves true. Left unawaited, the failure would arrive as an
  // unnamed one from `signIn`.
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') return null;
  return response.data.idToken;
}

/**
 * Sign in with a provider, end to end: the sheet, the ID token, and the
 * Supabase session. The caller sends the person on; this only says how it
 * ended.
 */
export async function signInWithProvider(
  provider: Provider,
): Promise<ProviderOutcome> {
  try {
    const token =
      provider === 'apple' ? await appleToken() : await googleToken();
    // Google answers a closed sheet with `{ type: 'cancelled' }` rather
    // than by throwing, and both providers can hand back a credential with
    // no ID token in it — nothing to exchange either way.
    if (token === null) return { status: 'cancelled' };
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider,
      token,
    });
    if (error) return { status: 'failed', message: t.errors.providerFailed };
    if (!data.session) {
      return { status: 'failed', message: t.errors.providerFailed };
    }
    return { status: 'signed-in' };
  } catch (error) {
    if (cancelled(error)) return { status: 'cancelled' };
    return { status: 'failed', message: t.errors.providerFailed };
  }
}
