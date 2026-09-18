import { createServer } from 'node:http';
import { AuthError, PostgrestError, createClient } from '@supabase/supabase-js';
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
    // The code screen's whole failure surface: GoTrue answers a wrong code
    // and an expired one alike, and `otp_disabled` is the project having
    // e-mail OTP switched off.
    ['otp_expired', t.errors.otpInvalid],
    ['otp_disabled', t.errors.otpInvalid],
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

  /**
   * The production failure of 2026-09-18, driven through the real client.
   *
   * GoTrue answers a mail it could not send with 500 and
   * `error_code: unexpected_failure`, and the sign-up screen showed the
   * generic line — as though the person had mistyped their address. The
   * first fix for it was inert: it switched on `error.code`, and auth-js
   * turns every 5xx into `AuthRetryableFetchError` before it reads the
   * body, with `code` hard-coded to undefined. A review caught that.
   *
   * So this does not hand-build an error. It stands up a server that
   * answers exactly what production answered, signs up against it with
   * the real `@supabase/supabase-js`, and asks what the screen would say.
   * The day the library changes that shape, this fails instead of the
   * screen.
   */
  it('names a refused confirmation mail, through the client that raises it', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          code: 500,
          error_code: 'unexpected_failure',
          msg: 'Error sending confirmation email',
        }),
      );
    });
    await new Promise<void>((listening) => {
      server.listen(0, '127.0.0.1', listening);
    });
    try {
      const address = server.address();
      if (address === null || typeof address === 'string')
        throw new Error('no port');
      const client = createClient(`http://127.0.0.1:${address.port}`, 'anon', {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await client.auth.signUp({
        email: 'someone@example.net',
        password: 'a-long-enough-password',
      });
      expect(error).not.toBeNull();
      // The shape the first fix assumed it would get, and did not.
      expect(error?.code).toBeUndefined();
      expect(error?.status).toBe(500);
      expect(authErrorText(error as AuthError)).toBe(t.errors.mailNotSent);
      expect(t.errors.mailNotSent).not.toBe(t.errors.generic);
    } finally {
      await new Promise<void>((closed) => {
        server.close(() => closed());
      });
    }
  }, 20_000);

  it('keeps the generic line for a five-hundred that is not about mail', () => {
    const failed = new AuthError('conversion from database failed', 500);
    expect(authErrorText(failed)).toBe(t.errors.generic);
  });

  it('gives an unknown code the generic line', () => {
    expect(authErrorText(authError('mfa_challenge_expired'))).toBe(
      t.errors.generic,
    );
  });

  it('gives an error with no code the generic line, whatever its status', () => {
    // `verifyOtp` answers a refused code with 403, and this is the line
    // that keeps the mapping keyed on the code rather than on the status:
    // an unnamed 403 from anywhere else must not be read as a wrong code.
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
