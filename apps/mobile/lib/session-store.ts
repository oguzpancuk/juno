import { KEY_BYTES, NONCE_BYTES, open, seal } from './session-crypto';

/**
 * The storage logic, with the platform pieces injected so it can be
 * tested without a device. `session-storage.ts` is the thin binding that
 * supplies the real keychain, the real store and the real randomness.
 */

export interface Keychain {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
}

export interface Store {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SealedStoreOptions {
  readonly keychain: Keychain;
  readonly store: Store;
  readonly randomBytes: (size: number) => Uint8Array;
  /** The keychain entry holding the key. */
  readonly keyName: string;
}

export const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
};

export const fromBase64 = (value: string): Uint8Array => {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * A store that seals what it keeps, with the key in the keychain.
 *
 * Nothing here throws: supabase-js calls this on every launch and on
 * every token refresh, and a session that cannot be read or written is a
 * sign-in, not a crash.
 */
export function sealedStore(options: SealedStoreOptions): Store {
  const { keychain, store, randomBytes, keyName } = options;
  let cached: Uint8Array | null = null;

  const key = async (): Promise<Uint8Array> => {
    if (cached) return cached;
    const stored = await keychain.get(keyName);
    if (stored !== null) {
      const bytes = fromBase64(stored);
      // A value of the wrong size was not written by this version; making
      // a new one costs a sign-in, keeping it costs every read for ever.
      if (bytes.length === KEY_BYTES) {
        cached = bytes;
        return bytes;
      }
    }
    const fresh = randomBytes(KEY_BYTES);
    await keychain.set(keyName, toBase64(fresh));
    cached = fresh;
    return fresh;
  };

  return {
    async getItem(name: string): Promise<string | null> {
      try {
        const stored = await store.getItem(name);
        return stored === null ? null : open(await key(), stored);
      } catch {
        return null;
      }
    },
    async setItem(name: string, value: string): Promise<void> {
      try {
        const nonce = randomBytes(NONCE_BYTES);
        await store.setItem(name, seal(await key(), nonce, value));
      } catch {
        // Better signed out than holding something that cannot be opened.
        await store.removeItem(name).catch(() => undefined);
      }
    },
    async removeItem(name: string): Promise<void> {
      await store.removeItem(name);
    },
  };
}
