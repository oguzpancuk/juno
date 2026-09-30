import { router } from 'expo-router';
import { useEffect } from 'react';
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
  return row.success && !needsConsent(row.data.consent_version, LEGAL_VERSION);
}

/**
 * The gate for everything inside the tab bar. The entry screen already
 * sends a member with an older record to `/consent`; this covers the
 * ways past it — a web address typed or bookmarked straight into a tab,
 * and an app left open across a deploy that brought a new text.
 *
 * Asks once per signed-in user per mount of the tabs. Anything short of
 * a readable row answers nothing: no profile is the screens' own
 * business (they send it to onboarding), and a failed read is not a
 * reason to lock someone out — the next launch asks again.
 */
export function useConsentGate(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('consent_version')
        .eq('id', userId)
        .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
        .maybeSingle();
      if (cancelled || error || !data) return;
      const row = ConsentRow.safeParse(data);
      if (row.success && needsConsent(row.data.consent_version, LEGAL_VERSION))
        router.replace('/consent');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
