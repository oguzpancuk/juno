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
