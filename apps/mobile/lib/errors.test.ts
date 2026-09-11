import { AuthError, PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { authErrorText, dbErrorText } from './errors';
import { t } from './strings';

/** An error as the auth client raises it: a message, a status, a code. */
const authError = (code: string | undefined, status = 400): AuthError =>
  new AuthError('raw provider text', status, code);

describe('authErrorText', () => {
  it.each([
    ['weak_password', t.errors.weakPassword],
    ['invalid_credentials', t.errors.invalidCredentials],
    ['user_already_exists', t.errors.accountExists],
    ['email_exists', t.errors.accountExists],
    ['email_not_confirmed', t.errors.emailNotConfirmed],
    ['validation_failed', t.errors.emailInvalid],
    ['email_address_invalid', t.errors.emailInvalid],
    ['over_email_send_rate_limit', t.errors.rateLimited],
    ['over_request_rate_limit', t.errors.rateLimited],
  ])('maps %s to its own sentence', (code, text) => {
    expect(authErrorText(authError(code))).toBe(text);
  });

  it('gives a closed sign-up the generic line', () => {
    expect(authErrorText(authError('signup_disabled'))).toBe(t.errors.generic);
  });

  it('gives an unknown code the generic line', () => {
    expect(authErrorText(authError('mfa_challenge_expired'))).toBe(
      t.errors.generic,
    );
  });

  it('gives an error with no code the generic line, whatever its status', () => {
    // The OTP flow used to read a bare 403 as a wrong code; there is no
    // such request any more, so a 403 is as unnamed as any other.
    expect(authErrorText(authError(undefined, 403))).toBe(t.errors.generic);
    expect(authErrorText(authError(undefined))).toBe(t.errors.generic);
  });

  it('never lets the provider text through', () => {
    for (const code of ['weak_password', 'unexpected_failure', undefined]) {
      expect(authErrorText(authError(code))).not.toContain('raw provider');
    }
  });
});

const dbError = (code: string, message = ''): PostgrestError =>
  new PostgrestError({ code, message, details: '', hint: '' });

describe('dbErrorText', () => {
  it('maps the three named codes', () => {
    expect(dbErrorText(dbError('23505'))).toBe(t.errors.alreadyExists);
    expect(dbErrorText(dbError('42501'))).toBe(t.errors.notAllowed);
    expect(dbErrorText(dbError('23514'))).toBe(t.errors.invalidData);
  });

  it('reads the age rule off the constraint name, not the column', () => {
    expect(
      dbErrorText(
        dbError(
          '23514',
          'violates check constraint "profiles_birth_date_check"',
        ),
      ),
    ).toBe(t.onboarding.errors.underage);
    expect(
      dbErrorText(dbError('23514', 'birth_date ... some other constraint')),
    ).toBe(t.errors.invalidData);
  });

  it('gives an unknown code the generic line', () => {
    expect(dbErrorText(dbError('XX000'))).toBe(t.errors.generic);
  });
});
