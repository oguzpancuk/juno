import type { AuthError, PostgrestError } from '@supabase/supabase-js';
import { t } from './strings';

/**
 * Turn provider errors into Turkish UI text. Known codes get a specific
 * sentence; everything else the generic line — raw English never reaches
 * the screen (PRD: single-language UI).
 */
export function authErrorText(error: AuthError): string {
  switch (error.code) {
    case 'validation_failed':
    case 'email_address_invalid':
      return t.errors.emailInvalid;
    case 'otp_expired':
    case 'otp_disabled':
      return t.errors.otpInvalid;
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return t.errors.rateLimited;
    default:
      // 403 on verifyOtp with a wrong code carries no code in some versions.
      return error.status === 403 ? t.errors.otpInvalid : t.errors.generic;
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
