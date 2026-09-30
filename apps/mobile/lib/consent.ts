import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { z } from 'zod';
import { ConsentVersionSchema, needsConsent } from './consent-rules';
import { LEGAL_VERSION } from './legal';
import type { SessionState } from './session';
import { READ_TIMEOUT_MS, supabase } from './supabase';

/**
 * Re-consent (KVKK). `profiles.consent_version` records the notice a
 * member accepted; when the text in force is newer, the app stops at
 * `/consent` until they accept it again or leave. Which versions ask is
 * `lib/consent-rules.ts`; what the database takes is
 * `profiles_set_consent` (forward only, the stamp is the server's) and
 * `profiles_consent_recorded` (never without a version).
 */

const ConsentRow = z.object({ consent_version: ConsentVersionSchema });

/**
 * Who this build already knows to be on the current notice: the tabs'
 * gate read their row, onboarding just wrote it, or they just accepted it
 * here. Module state, so it lives as long as this bundle. It only saves
 * a read; what counts as current is still this build's `LEGAL_VERSION`.
 */
const current = new Set<string>();

/** A record this build has just seen or written as current. */
export function markConsentCurrent(userId: string): void {
  current.add(userId);
}

/**
 * Whether this build knows the member to be on the current notice. The
 * root layout's match listener asks before it navigates into the tabs:
 * a match arriving while the member stands at `/consent` must not push
 * the tab group over it (review of #19).
 */
export function isConsentKnownCurrent(userId: string): boolean {
  return current.has(userId);
}

/**
 * Record that the member accepted the notice this build carries. The
 * server stamps `consent_at`. Answers true only once the row reads back
 * with that version: an update RLS filtered to nothing is not an error
 * in PostgREST, and saying "accepted" over it would leave the member at
 * the same screen on the next launch with no reason given. A throw
 * answers false too, so the screen never stays on "Kaydediliyor…".
 */
export async function acceptCurrentNotice(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ consent_version: LEGAL_VERSION })
      .eq('id', userId)
      .select('consent_version')
      .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
      .maybeSingle();
    if (error || !data) return false;
    const row = ConsentRow.safeParse(data);
    const ok =
      row.success && !needsConsent(row.data.consent_version, LEGAL_VERSION);
    if (ok) current.add(userId);
    return ok;
  } catch {
    return false;
  }
}

/**
 * The member's record against this build's notice: `missing` (no
 * profile yet), `ask`, `current`, or `error` when it could not be read.
 * A throw (a timeout) is an error, never an answer.
 */
export async function readConsent(
  userId: string,
): Promise<'missing' | 'ask' | 'current' | 'error'> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('consent_version')
      .eq('id', userId)
      .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
      .maybeSingle();
    if (error) return 'error';
    if (!data) return 'missing';
    const row = ConsentRow.safeParse(data);
    if (!row.success) return 'error';
    if (needsConsent(row.data.consent_version, LEGAL_VERSION)) return 'ask';
    current.add(userId);
    return 'current';
  } catch {
    return 'error';
  }
}

export type ConsentGate = 'checking' | 'current' | 'ask' | 'error';

export interface ConsentGateState {
  readonly gate: ConsentGate;
  /** Read the record again, after `error`. */
  readonly retry: () => void;
}

/**
 * The tabs' answer, for the stacks inside them (`components/TabStack.tsx`).
 * Outside the tabs there is no gate, hence the default.
 */
export const ConsentGateContext = createContext<ConsentGateState>({
  gate: 'current',
  retry: () => undefined,
});

/**
 * The gate for everything inside the tab bar. The entry screen already
 * sends a member with an older record to `/consent`; this covers the
 * ways past it — a web address typed or restored straight into a tab.
 *
 * No screen inside the tabs mounts until this answers `current`:
 * `TabStack` puts a spinner (or, on `error`, a retry) where each screen
 * would be. Rendering them meanwhile and redirecting on the answer was
 * not enough: a tab screen starts its own requests on mount, and the
 * chat's is a write — it marks the other member's messages read
 * (evaluator-qa, 2026-09-30) — before the member has accepted anything.
 * It is the screens that wait, not the navigators: a navigator that
 * mounts late mounts on its initial route and drops the rest of the URL
 * (`/chat/<id>` landing on the list — evaluator-qa again, when the wait
 * was put one level too high).
 *
 * Closed until it knows (review of #19): while the session is still
 * being read, and when the record cannot be read. The entry screen does
 * the same (an error with a retry), so which door a member came in by
 * does not decide whether they are asked. Signed out answers `current`:
 * the screens' own guards send that person to sign-in. No profile
 * answers `current` too: the screens send it to onboarding, which writes
 * the current version.
 *
 * `ask` sends the member to `/consent`, carrying the path they were on
 * so accepting returns there (`returnPath`).
 */
export function useConsentGate(
  session: SessionState,
  path: string,
): ConsentGateState {
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const known = userId !== null && current.has(userId);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{
    userId: string;
    attempt: number;
    gate: ConsentGate;
  } | null>(null);
  // The path at the moment of asking, not a dependency: moving between
  // tabs must not read the record again.
  const pathRef = useRef(path);
  // Declared before the read, so it has run by the time the read's
  // answer arrives.
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  useEffect(() => {
    if (!userId || current.has(userId)) return;
    let cancelled = false;
    void readConsent(userId).then((read) => {
      if (cancelled) return;
      const gate: ConsentGate =
        read === 'ask' ? 'ask' : read === 'error' ? 'error' : 'current';
      setAnswer({ userId, attempt, gate });
      if (gate === 'ask')
        router.replace({
          pathname: '/consent',
          params: { next: pathRef.current },
        });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const gate: ConsentGate =
    session.status === 'loading'
      ? 'checking'
      : userId === null || known
        ? 'current'
        : answer?.userId === userId && answer.attempt === attempt
          ? answer.gate
          : 'checking';
  // One object per answer, not per render: it is a context value.
  return useMemo(() => ({ gate, retry }), [gate, retry]);
}
