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
 * There are no native SDKs here, so both go the way the web goes: the
 * tab is sent to the provider's own page and comes back to this origin
 * carrying the session, which supabase-js picks up on load
 * (`detectSessionInUrl`, on for the web in `lib/supabase.ts`). The origin
 * has to be on the project's redirect allow-list or Supabase refuses to
 * send anyone back to it — one line per deployed origin, in
 * docs/auth-setup.md. Apple and Google share that list.
 *
 * Apple's page is built by Supabase from the Services ID its Apple
 * provider carries first (docs/auth-setup.md, 3b), and posts its answer
 * back to Supabase, not here. Apple's scopes are fixed there — e-mail and
 * name — so unlike the phone, which asks for the address only, a first
 * web sign-in may hand over the name the person chose to share; the
 * notice says so (`lib/legal.ts`). A build with no Services ID has no
 * button (`lib/oauth.ts` `availability`).
 */

export async function providerAvailability(): Promise<Availability> {
  return availability({
    platform: 'web',
    appleNative: false,
    appleWebConfigured: env.appleServicesId !== undefined,
    googleConfigured: env.googleWebClientId !== undefined,
  });
}

export async function signInWithProvider(
  provider: Provider,
): Promise<ProviderOutcome> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Back to wherever this build is served from, which is the origin
      // the allow-list has to name.
      redirectTo: globalThis.location.origin,
    },
  });
  if (error) return { status: 'failed', message: t.errors.providerFailed };
  return { status: 'redirected' };
}
