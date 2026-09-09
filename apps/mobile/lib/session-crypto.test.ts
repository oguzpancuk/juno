import { describe, expect, it } from 'vitest';
import { KEY_BYTES, NONCE_BYTES, open, seal } from './session-crypto';

const key = (fill: number) => new Uint8Array(KEY_BYTES).fill(fill);
const nonce = (fill: number) => new Uint8Array(NONCE_BYTES).fill(fill);
const SESSION = JSON.stringify({
  access_token: 'a'.repeat(800),
  refresh_token: 'r'.repeat(40),
  user: { id: '00000000-0000-4000-8000-000000000001' },
});

describe('session sealing', () => {
  it('opens what it sealed', () => {
    expect(open(key(1), seal(key(1), nonce(2), SESSION))).toBe(SESSION);
  });

  it('does not open with another key', () => {
    // The keychain entry is gone — a reinstall, a restored backup. The
    // answer is "sign in again", not a crash.
    expect(open(key(9), seal(key(1), nonce(2), SESSION))).toBeNull();
  });

  it('does not open a tampered value', () => {
    const sealed = seal(key(1), nonce(2), SESSION);
    const [version, nonceText, body] = sealed.split('.');
    const flipped = `${body?.slice(0, -2) ?? ''}AA`;
    expect(open(key(1), `${version}.${nonceText}.${flipped}`)).toBeNull();
  });

  it('does not open a value from an unknown format', () => {
    expect(open(key(1), 'nonsense')).toBeNull();
    expect(open(key(1), '2.aaa.bbb')).toBeNull();
    expect(open(key(1), '')).toBeNull();
  });

  it('keeps the ciphertext out of the stored text', () => {
    const sealed = seal(key(1), nonce(2), SESSION);
    expect(sealed).not.toContain('refresh_token');
    expect(sealed).not.toContain('r'.repeat(40));
  });

  it('refuses a key or nonce of the wrong size', () => {
    expect(() => seal(new Uint8Array(8), nonce(2), 'x')).toThrow();
    expect(() => seal(key(1), new Uint8Array(8), 'x')).toThrow();
  });

  it('seals the same text differently under different nonces', () => {
    // Reusing a nonce with one key is the failure mode this format is
    // shaped to avoid, so the nonce travels with the value.
    expect(seal(key(1), nonce(2), SESSION)).not.toBe(
      seal(key(1), nonce(3), SESSION),
    );
  });
});
