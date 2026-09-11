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
 * replace lands on `[sign-in]` by construction. `dismissAll` is kept: it
 * pops the focused tab's stack to its top, which is still the right
 * thing to do with a session that no longer exists.
 */
export function leaveToSignIn(): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/sign-in');
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
