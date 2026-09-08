import type { AuthError, PostgrestError } from '@supabase/supabase-js';
import { t } from './strings';

/**
 * Turn provider errors into Turkish UI text. Known codes get a specific
 * sentence; everything else the generic line — raw English never reaches
 * the screen (PRD: single-language UI).
 */
export function authErrorText(error: AuthError): string {
  const code = error.code ?? '';
  if (
    code === 'otp_expired' ||
    code === 'otp_disabled' ||
    /expired|invalid/i.test(error.message)
  ) {
    return t.errors.otpInvalid;
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit'
  ) {
    return t.errors.rateLimited;
  }
  return t.errors.generic;
}

export function dbErrorText(error: PostgrestError): string {
  switch (error.code) {
    case '23505':
      return t.errors.alreadyExists;
    case '23514':
      return /birth_date/.test(error.message)
        ? t.onboarding.errors.underage
        : t.errors.invalidData;
    case '42501':
      return t.errors.notAllowed;
    default:
      return t.errors.generic;
  }
}
