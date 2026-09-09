/**
 * Where the Supabase session lives, with the platform pieces injected so
 * the logic can be tested without a device.
 *
 * The session is a refresh token: whoever reads it is signed in as that
 * person until it is revoked. React Native's AsyncStorage — Supabase's
 * documented Expo default — is a plain SQLite file in the app sandbox, so
 * the token sits there in clear text: fine against another app, useless
 * against anyone who reaches the file system.
 *
 * It goes in the keychain instead, whole. An earlier version of this file
 * sealed it with a cipher and kept only the key there, on the premise
 * that SecureStore caps a value at 2 KB. Measured on the simulator, this
 * version of expo-secure-store stores 16 KB without complaint, so the
 * cipher, the key handling and everything that could go wrong with them
 * were deleted rather than debugged.
 */

export interface Keychain {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
}

export interface Store {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface KeychainStoreOptions {
  readonly keychain: Keychain;
  /**
   * Where the session used to live. Read once to move it, and cleared
   * whenever the session is written or dropped: an install that upgrades
   * must not leave a live refresh token behind in clear text.
   */
  readonly legacy: Store;
}

/**
 * Nothing here throws. supabase-js calls this on every launch and every
 * token refresh, and a session that cannot be read is a sign-in, never a
 * crash — but a session that cannot be *written* leaves what is already
 * stored alone, because a keychain that is briefly unavailable must not
 * cost someone their session.
 */
export function keychainStore(options: KeychainStoreOptions): Store {
  const { keychain, legacy } = options;

  return {
    async getItem(name: string): Promise<string | null> {
      try {
        const stored = await keychain.get(name);
        if (stored !== null) {
          // A leftover from before the move is dead weight and a live
          // token; drop it the moment the keychain has the real one.
          await legacy.removeItem(name).catch(() => undefined);
          return stored;
        }
      } catch {
        return null;
      }
      // The move: an install that signed in under the old build.
      try {
        const old = await legacy.getItem(name);
        if (old === null) return null;
        await keychain.set(name, old);
        await legacy.removeItem(name);
        return old;
      } catch {
        return null;
      }
    },

    async setItem(name: string, value: string): Promise<void> {
      try {
        await keychain.set(name, value);
        await legacy.removeItem(name).catch(() => undefined);
      } catch {
        // Leave what is stored where it is: this may be a locked device
        // rather than a bad value.
      }
    },

    async removeItem(name: string): Promise<void> {
      // Both, always: signing out has to clear the old place too.
      await keychain.remove(name).catch(() => undefined);
      await legacy.removeItem(name).catch(() => undefined);
    },
  };
}
