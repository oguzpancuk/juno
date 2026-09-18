import type { AuthError, PostgrestError } from '@supabase/supabase-js';
import { t } from './strings';

/**
 * Turn provider errors into Turkish UI text. Known codes get a specific
 * sentence; everything else the generic line — raw English never reaches
 * the screen (PRD: single-language UI).
 */
export function authErrorText(error: AuthError): string {
  // Before the codes, because this one has none. GoTrue answers a mail it
  // could not send with 500 and `error_code: unexpected_failure`, but
  // auth-js turns every 5xx into `AuthRetryableFetchError` before it looks
  // at the body — the class hard-codes `code` to undefined — so the switch
  // below can never see it and the sign-up screen said "something went
  // wrong", as though the person had mistyped their address (seen in
  // production, 2026-09-18). What survives the wrapper is the status and
  // the message, so those are what this reads. Verified by pushing the
  // exact production response through the real client, which is what
  // `errors.test.ts` does rather than hand-building an error shape the
  // library does not produce.
  //
  // `/email/iu` is the only thing separating a mail five-hundred from any
  // other, and every screen that calls this is a confirmation-mail screen
  // today; a password-reset screen reusing it would need the sentence
  // widened.
  if ((error.status ?? 0) >= 500 && /email/iu.test(error.message)) {
    return t.errors.mailNotSent;
  }
  switch (error.code) {
    case 'validation_failed':
    case 'email_address_invalid':
      return t.errors.emailInvalid;
    case 'weak_password':
      return t.errors.weakPassword;
    case 'invalid_credentials':
      return t.errors.invalidCredentials;
    // Two spellings of one situation: `signUp` on a known address answers
    // the first, an e-mail change onto a taken address the second.
    case 'user_already_exists':
    case 'email_exists':
      return t.errors.accountExists;
    case 'email_not_confirmed':
      return t.errors.emailNotConfirmed;
    // Every refused code, whatever was wrong with it: GoTrue answers a
    // wrong code and an expired one identically, so the app cannot tell
    // them apart and the sentence covers both. `otp_disabled` is the
    // project having e-mail OTP switched off — nothing a person can fix,
    // but the same screen is where they would read it.
    case 'otp_expired':
    case 'otp_disabled':
      return t.errors.otpInvalid;
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return t.errors.rateLimited;
    case 'signup_disabled':
    default:
      // A closed door (`signup_disabled`) and anything unnamed: nothing
      // the person typed would fix it, so the generic line.
      return t.errors.generic;
  }
}

export function dbErrorText(error: PostgrestError): string {
  switch (error.code) {
    case '23505':
      return t.errors.alreadyExists;
    case '23514':
      // The constraint's own name, not the word "birth_date": several
      // other rules mention that column, and one of them was telling
      // people they were under 18 for an unrelated mismatch.
      return error.message.includes('profiles_birth_date_check')
        ? t.onboarding.errors.underage
        : t.errors.invalidData;
    case '42501':
      return t.errors.notAllowed;
    default:
      return t.errors.generic;
  }
}
