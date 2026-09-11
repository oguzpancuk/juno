import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  modeParamSchema,
  parseCredentials,
} from './auth';

const PASSWORD = 'p'.repeat(PASSWORD_MIN);

describe('parseCredentials', () => {
  it('trims and lowercases the e-mail', () => {
    const result = parseCredentials({
      email: '  Ayse@Example.COM ',
      password: PASSWORD,
    });
    expect(result).toEqual({
      ok: true,
      value: { email: 'ayse@example.com', password: PASSWORD },
    });
  });

  it('rejects a malformed address as the e-mail field', () => {
    expect(parseCredentials({ email: 'ayse@', password: PASSWORD })).toEqual({
      ok: false,
      field: 'email',
    });
    expect(parseCredentials({ email: '', password: PASSWORD })).toEqual({
      ok: false,
      field: 'email',
    });
  });

  it('rejects a password one short of the minimum as the password field', () => {
    expect(
      parseCredentials({
        email: 'ayse@example.com',
        password: 'p'.repeat(PASSWORD_MIN - 1),
      }),
    ).toEqual({ ok: false, field: 'password' });
  });

  it('rejects a password one past the maximum as the password field', () => {
    expect(
      parseCredentials({
        email: 'ayse@example.com',
        password: 'p'.repeat(PASSWORD_MAX + 1),
      }),
    ).toEqual({ ok: false, field: 'password' });
  });

  it('accepts both ends of the allowed length', () => {
    for (const length of [PASSWORD_MIN, PASSWORD_MAX]) {
      const result = parseCredentials({
        email: 'ayse@example.com',
        password: 'p'.repeat(length),
      });
      expect(result.ok).toBe(true);
    }
  });

  it('does not trim the password', () => {
    // A leading space is part of the secret; the seven characters after it
    // are not a password on their own.
    const result = parseCredentials({
      email: 'ayse@example.com',
      password: ' ' + 'p'.repeat(PASSWORD_MIN - 1),
    });
    expect(result.ok).toBe(true);
  });

  it('names the e-mail when both fields are wrong', () => {
    // The top-most problem on the form, so the sentence shown matches the
    // field the person reaches first.
    expect(parseCredentials({ email: 'nope', password: 'short' })).toEqual({
      ok: false,
      field: 'email',
    });
  });
});

describe('modeParamSchema', () => {
  it('reads the two modes', () => {
    expect(modeParamSchema.parse('in')).toBe('in');
    expect(modeParamSchema.parse('up')).toBe('up');
  });

  it('opens sign-up for anything else', () => {
    expect(modeParamSchema.parse(undefined)).toBe('up');
    expect(modeParamSchema.parse('signin')).toBe('up');
    expect(modeParamSchema.parse(['in'])).toBe('up');
  });
});
