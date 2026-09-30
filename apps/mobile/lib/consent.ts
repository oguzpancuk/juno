import { router } from 'expo-router';
import { createContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { ConsentVersionSchema, needsConsent } from './consent-rules';
import { LEGAL_VERSION } from './legal';
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
 * Who this build already knows to be on the current notice: the entry
 * screen read their row, or they just accepted it here. Module state, so
 * it lives exactly as long as this bundle — a deploy that brings a new
 * `LEGAL_VERSION` brings a new bundle and an empty set.
 */
const current = new Set<string>();

/** The entry screen read a current record: the tabs need not ask again. */
export function markConsentCurrent(userId: string): void {
  current.add(userId);
}

/**
 * Record that the member accepted the notice this build carries. The
 * server stamps `consent_at`. Answers true only once the row reads back
 * with that version: an update RLS filtered to nothing is not an error
 * in PostgREST, and saying "accepted" over it would leave the member at
 * the same screen on the next launch with no reason given.
 */
export async function acceptCurrentNotice(userId: string): Promise<boolean> {
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
}

export type ConsentGate = 'checking' | 'current' | 'ask';

/**
 * The tabs' answer, for the stacks inside them (`components/TabStack.tsx`).
 * Outside the tabs there is no gate, hence the default.
 */
export const ConsentGateContext = createContext<ConsentGate>('current');

/**
 * The gate for everything inside the tab bar. The entry screen already
 * sends a member with an older record to `/consent`; this covers the
 * ways past it — a web address typed or restored straight into a tab,
 * and an app reopened across a deploy that brought a new text.
 *
 * No screen inside the tabs mounts until this answers: `TabStack` puts a
 * spinner where each screen would be. Rendering them meanwhile and
 * redirecting on the answer was not enough: a tab screen starts its own
 * requests on mount, and the chat's is a write — it marks the other
 * member's messages read (evaluator-qa, 2026-09-30) — before the member
 * has accepted anything. It is the screens that wait, not the
 * navigators: a navigator that mounts late mounts on its initial route
 * and drops the rest of the URL (`/chat/<id>` landing on the list —
 * evaluator-qa again, when the wait was put one level too high).
 *
 * `ask` also sends the member to `/consent`. Anything short of a readable
 * row answers `current`: no profile is the screens' own business (they
 * send it to onboarding), and a failed read is not a reason to lock
 * someone out — the next launch asks again.
 */
export function useConsentGate(userId: string | null): ConsentGate {
  const known = userId !== null && current.has(userId);
  const [answer, setAnswer] = useState<{
    userId: string;
    gate: ConsentGate;
  } | null>(null);
  useEffect(() => {
    if (!userId || current.has(userId)) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('consent_version')
        .eq('id', userId)
        .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
        .maybeSingle();
      if (cancelled) return;
      const row = ConsentRow.safeParse(data);
      const ask =
        !error &&
        row.success &&
        needsConsent(row.data.consent_version, LEGAL_VERSION);
      // Remembered only when the row said so; a failed read lets this
      // mount through and the next one asks again.
      if (!error && row.success && !ask) current.add(userId);
      setAnswer({ userId, gate: ask ? 'ask' : 'current' });
      if (ask) router.replace('/consent');
    })().catch(() => {
      // A read that throws (a timeout) fails open, like one that errors.
      if (cancelled) return;
      setAnswer({ userId, gate: 'current' });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  // Signed out or still reading the session: the screens' own guards
  // decide, and they send a signed-out person to sign-in.
  if (userId === null || known) return 'current';
  return answer?.userId === userId ? answer.gate : 'checking';
}
