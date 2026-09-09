import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

/**
 * Sealing and opening the stored session, kept pure so it can be tested
 * without a device.
 *
 * The session is a refresh token: whoever reads it is signed in as that
 * person until it is revoked. React Native's AsyncStorage is a plain
 * SQLite file in the app sandbox, so the token sits there in clear text —
 * fine against another app, useless against anyone holding the device's
 * file system (a jailbreak, a backup, a lab tool). The key lives in the
 * keychain instead, which is what the platform hardens, and only the
 * sealed bytes go to AsyncStorage. SecureStore itself cannot hold the
 * session: its values are capped at 2 KB and a Supabase session is
 * comfortably larger.
 *
 * XChaCha20-Poly1305 rather than AES-GCM: it takes a 24-byte random nonce,
 * so nonces can be drawn at random for ever without the birthday problem
 * that makes a 12-byte GCM nonce a footgun, and it is authenticated, so a
 * tampered value fails to open rather than decrypting to rubbish.
 */

export const KEY_BYTES = 32;
export const NONCE_BYTES = 24;

/** Version prefix, so a future format change is recognisable. */
const VERSION = 1;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * Seal one value. The nonce is stored beside the ciphertext: it is not a
 * secret, only a value that must never repeat for a given key.
 */
export function seal(
  key: Uint8Array,
  nonce: Uint8Array,
  plain: string,
): string {
  if (key.length !== KEY_BYTES) throw new Error('bad key length');
  if (nonce.length !== NONCE_BYTES) throw new Error('bad nonce length');
  const sealed = xchacha20poly1305(key, nonce).encrypt(
    new TextEncoder().encode(plain),
  );
  return `${VERSION}.${toBase64(nonce)}.${toBase64(sealed)}`;
}

/**
 * Open a sealed value, or null if it cannot be opened: a different key
 * (the keychain entry was lost), a tampered value, or a format this
 * version does not know. Null means "sign in again", never a crash.
 */
export function open(key: Uint8Array, stored: string): string | null {
  const parts = stored.split('.');
  if (parts.length !== 3 || parts[0] !== String(VERSION)) return null;
  const [, nonce, sealed] = parts;
  if (nonce === undefined || sealed === undefined) return null;
  try {
    const opened = xchacha20poly1305(key, fromBase64(nonce)).decrypt(
      fromBase64(sealed),
    );
    return new TextDecoder().decode(opened);
  } catch {
    return null;
  }
}
