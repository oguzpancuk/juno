import { describe, expect, it } from 'vitest';
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_MS,
  isCompleteOtp,
  normalizeOtp,
  refusedSend,
  resendSecondsLeft,
} from './otp';

describe('normalizeOtp', () => {
  it('keeps the digits of a pasted code and nothing else', () => {
    expect(normalizeOtp('123 456')).toBe('123456');
    expect(normalizeOtp(' 123456\n')).toBe('123456');
    expect(normalizeOtp('Kodun: 123456')).toBe('123456');
  });

  it('stops at six digits', () => {
    expect(normalizeOtp('1234567')).toBe('123456');
  });

  it('keeps a leading zero, which a number would lose', () => {
    expect(normalizeOtp('012345')).toBe('012345');
  });

  it('refuses digits the Latin keyboard does not produce', () => {
    // `\d` with the `u` flag is ASCII 0-9; Arabic-Indic digits are not a
    // code GoTrue would take, and turning them into one silently would
    // send six characters that cannot match.
    expect(normalizeOtp('٢٣٤٥٦٧')).toBe('');
  });
});

describe('isCompleteOtp', () => {
  it('wants all six digits', () => {
    expect(isCompleteOtp('12345')).toBe(false);
    expect(isCompleteOtp('123456')).toBe(true);
    expect(isCompleteOtp('')).toBe(false);
  });

  it('accepts a code that is only complete after normalisation', () => {
    expect(isCompleteOtp(' 123 456 ')).toBe(true);
  });

  it('is the length the mail template promises', () => {
    expect(OTP_LENGTH).toBe(6);
  });
});

describe('refusedSend', () => {
  it("waits out both of GoTrue's rate limits", () => {
    // The per-address floor and the project's hourly ceiling. The screen
    // starts its countdown on either, because the server is counting.
    expect(refusedSend('over_email_send_rate_limit')).toBe('wait');
    expect(refusedSend('over_request_rate_limit')).toBe('wait');
  });

  it('shows anything else as the error it is', () => {
    for (const code of [
      'email_address_invalid',
      'user_already_exists',
      'unexpected_failure',
      undefined,
    ]) {
      expect(refusedSend(code)).toBe('error');
    }
  });
});

describe('resendSecondsLeft', () => {
  const now = 1_700_000_000_000;

  it('is available before the screen has sent anything', () => {
    expect(resendSecondsLeft(null, now)).toBe(0);
  });

  it('counts the whole cooldown down, rounding up', () => {
    expect(resendSecondsLeft(now, now)).toBe(RESEND_COOLDOWN_MS / 1000);
    expect(resendSecondsLeft(now - 500, now)).toBe(60);
    expect(resendSecondsLeft(now - 59_500, now)).toBe(1);
  });

  it('is done at the cooldown and after it', () => {
    expect(resendSecondsLeft(now - RESEND_COOLDOWN_MS, now)).toBe(0);
    expect(resendSecondsLeft(now - RESEND_COOLDOWN_MS * 10, now)).toBe(0);
  });

  it('treats a clock that moved backwards as a full cooldown', () => {
    expect(resendSecondsLeft(now + 5_000, now)).toBe(RESEND_COOLDOWN_MS / 1000);
  });
});
