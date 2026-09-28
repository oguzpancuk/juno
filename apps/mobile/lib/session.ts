import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'signed-out' }
  | { readonly status: 'signed-in'; readonly session: Session };

/** Current auth session, kept in sync with Supabase auth events. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setState(
        data.session
          ? { status: 'signed-in', session: data.session }
          : { status: 'signed-out' },
      );
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(
          session ? { status: 'signed-in', session } : { status: 'signed-out' },
        );
      },
    );
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);
  return state;
}

/**
 * Leave the app for the sign-in screen with nothing of the old session
 * left on the stack.
 *
 * `replace` alone only swaps the top route. When signed-in screens were
 * pushed on the root stack, the tab group stayed underneath; the route
 * that follows sign-in is `/`, which redirects into the tab group again —
 * and expo-router, seeing the focused route diverge at the root, added a
 * *second* tab navigator rather than reusing the one already there. Two
 * bottom tab bars then sat in one stack: an edge swipe revealed the stale
 * one, and on Android back landed in it instead of leaving the app.
 *
 * Since 2026-09-11 every signed-in screen lives on a stack inside its
 * tab, so the root holds exactly one signed-in route, `(tabs)`, and the
 * replace lands on `[door, sign-in]` at worst — `lib/routes.test.ts`
 * keeps the tree that shape. The tree is necessary, not sufficient: two
 * router calls in one handler that both target the tab tree can still
 * add a second `(tabs)` before the first has mounted (see the comment in
 * app/onboarding.tsx), so a handler makes ONE call into the tab tree. The `dismissAll` that used to precede
 * the replace is gone: with `(tabs)` as the root's only route it was a
 * POP_TO_TOP no navigator handled (a dev warning on every sign-out,
 * watched on the simulator), and the replace removes the whole tab
 * subtree, nested stacks included, on its own.
 */
export function leaveToSignIn(): void {
  // Everyone who arrives here had an account a moment ago — a sign-out,
  // an expired token — so the door opens in sign-in mode; without the
  // param the screen defaults to sign-up, the newcomer's door.
  router.replace({ pathname: '/sign-in', params: { mode: 'in' } });
}

/**
 * Sign out, then go to sign-in: settings' sign-out and delete, and
 * onboarding's "Farklı bir hesapla gir". Best-effort: a failed sign-out
 * must still leave the screen. supabase-js 2.116 clears the stored
 * session on every outcome of `signOut()` except an unreadable one — a
 * refusal (401/403/404, which is what a deleted user's token gets) and a
 * network failure alike — so the person does not come back signed in.
 * The server's /logout has a deadline (lib/supabase.ts); a token refresh
 * auth-js runs first, for a session about to expire, does not — see the
 * note there.
 */
export function signOutAndLeave(): void {
  void supabase.auth
    .signOut()
    .catch(() => undefined)
    .then(() => leaveToSignIn());
}

/**
 * The signed-out guard every screen behind the session uses.
 *
 * `<Redirect href="/sign-in" />` is `router.replace`, which is the call
 * that leaves the old tab group on the stack — and this guard fires on
 * its own when a refresh token expires while the app is backgrounded, so
 * it is the likeliest way into that state, not the rarest. Going through
 * `leaveToSignIn` makes the property hold wherever the guard is written
 * rather than at each place someone remembered.
 */
export function RedirectToSignIn(): null {
  useEffect(() => {
    leaveToSignIn();
  }, []);
  return null;
}
