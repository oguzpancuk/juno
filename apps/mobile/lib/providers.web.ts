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
 * Apple and Google in a browser — the web client's half of
 * `lib/providers.ts`, which Metro swaps in by filename.
 *
 * There are no native SDKs here, so Google goes the way the web goes: the
 * tab is sent to Google's own page and comes back to this origin carrying
 * a code, which supabase-js exchanges for a session on load
 * (`detectSessionInUrl`, on for the web in `lib/supabase.ts`). The origin
 * has to be on the project's redirect allow-list or Supabase refuses to
 * send anyone back to it — one line per deployed origin, in
 * docs/auth-setup.md.
 *
 * Apple is not offered here at all: the browser route needs an Apple
 * Services ID and key that the iOS App ID does not provide, so the button
 * is absent rather than broken (`lib/oauth.ts` `availability`).
 */

export async function providerAvailability(): Promise<Availability> {
  return availability({
    platform: 'web',
    appleNative: false,
    googleConfigured: env.googleWebClientId !== undefined,
  });
}

export async function signInWithProvider(
  provider: Provider,
): Promise<ProviderOutcome> {
  if (provider === 'apple') {
    // Unreachable through the UI — `availability` hides the button — and
    // a failure rather than a throw if it is ever reached another way.
    return { status: 'failed', message: t.errors.providerFailed };
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Back to wherever this build is served from, which is the origin
      // the allow-list has to name.
      redirectTo: globalThis.location.origin,
    },
  });
  if (error) return { status: 'failed', message: t.errors.providerFailed };
  return { status: 'redirected' };
}
