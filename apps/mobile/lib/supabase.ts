import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from './env';
import { sessionStorage } from './session-storage';

/**
 * How long a read may hang before it is abandoned.
 *
 * supabase-js has no request timeout of its own, so a connection that is
 * accepted and then never answers waits for ever — and several screens
 * show nothing but a spinner until their first read resolves.
 *
 * It lives here, next to the client, rather than in whichever module
 * happened to need it first: every consumer already imports this one, and
 * this one imports nothing of theirs, so no reader has to work out which
 * module initialises before which.
 */
export const READ_TIMEOUT_MS = 10000;

/**
 * The one request given a deadline here: signing out. auth-js waits for
 * the server's /logout before it clears the session and takes no timeout
 * or signal for it, so on a connection that is accepted and never answers
 * the person would sit on the profile, the settings chip already off, with
 * nothing happening (review, 2026-09-15). Aborted, the call fails the way a
 * dropped connection does, and auth-js clears the session on this device
 * exactly once — the server's refresh token may then stay unrevoked, as it
 * does for any sign-out made offline. Every other request passes through.
 */
// Built the way supabase-js builds its auth URL (`new URL('auth/v1', base)`
// on a base ending in a slash), so a trailing slash in the env value
// cannot make the two disagree.
const LOGOUT_URL = new URL(
  'auth/v1/logout',
  env.supabaseUrl.endsWith('/') ? env.supabaseUrl : `${env.supabaseUrl}/`,
).href;

const boundedFetch: typeof fetch = (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!url.startsWith(LOGOUT_URL) || init?.signal) return fetch(input, init);
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(READ_TIMEOUT_MS),
  });
};

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  global: { fetch: boundedFetch },
  auth: {
    // The keychain on a device, the browser's own storage on the web.
    // See lib/session-storage.ts.
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
