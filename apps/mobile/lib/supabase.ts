import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from './env';
import { sessionStorage } from './session-storage';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
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
