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
   * Where the session used to live, and — because it goes when the app
   * does — how a fresh install is told apart from an upgrade. Read once
   * to move an old session across, and cleared whenever the session is
   * written or dropped: an install that upgrades must not leave a live
   * refresh token behind in clear text.
   */
  readonly legacy: Store;
  /** Marks that this install has run before. See `install()`. */
  readonly installMarker: string;
}

/**
 * Nothing here throws. supabase-js calls this on every launch and every
 * token refresh, and a session that cannot be read is a sign-in, never a
 * crash — but a session that cannot be *written* leaves what is already
 * stored alone, because a keychain that is briefly unavailable must not
 * cost someone their session.
 */
export function keychainStore(options: KeychainStoreOptions): Store {
  const { keychain, legacy, installMarker } = options;

  /**
   * The last value this process knows to be stored.
   *
   * A read that fails is not the same as a read that found nothing, and
   * supabase-js reads the difference as "storage was cleared under us":
   * when it rotates a refresh token it re-reads the store afterwards, and
   * a null there makes it throw the new tokens away and keep one the
   * server has already consumed. Locking the phone mid-refresh would sign
   * the person out on the next launch. So a failed read answers with what
   * we last saw rather than with nothing.
   */
  const known = new Map<string, string | null>();

  /**
   * An iOS keychain entry outlives the app that wrote it: delete Juno,
   * reinstall it, and the old session is still there — someone who wiped
   * the app to get out of an account, or the next owner of a resold
   * phone, lands inside it without signing in. AsyncStorage does go with
   * the app, so its emptiness is the signal: no marker means this install
   * has never run, and any keychain entry belongs to a previous one.
   */
  let installed: Promise<void> | null = null;
  const install = async (name: string): Promise<void> => {
    try {
      if ((await legacy.getItem(installMarker)) !== null) return;
      await keychain.remove(name);
      await legacy.setItem(installMarker, '1');
    } catch {
      // A marker that cannot be written means the check runs again next
      // launch, which is harmless; failing the read is not.
    }
  };
  const ensureInstalled = (name: string): Promise<void> => {
    installed ??= install(name);
    return installed;
  };

  /** True while a clear-text copy might still exist to clean up. */
  let legacyMayHold = true;
  const dropLegacy = async (name: string): Promise<void> => {
    if (!legacyMayHold) return;
    try {
      await legacy.removeItem(name);
      legacyMayHold = false;
    } catch {
      // Try again on the next write rather than reporting a failure.
    }
  };

  return {
    async getItem(name: string): Promise<string | null> {
      await ensureInstalled(name);
      try {
        const stored = await keychain.get(name);
        if (stored !== null) {
          known.set(name, stored);
          await dropLegacy(name);
          return stored;
        }
      } catch {
        // Never the clear-text copy as a fallback: that would undo the
        // whole point on exactly the platform where the keychain is
        // unreliable.
        return known.get(name) ?? null;
      }
      // The move: an install that signed in under the old build.
      try {
        const old = await legacy.getItem(name);
        if (old === null) {
          known.set(name, null);
          return null;
        }
        await keychain.set(name, old);
        known.set(name, old);
        await dropLegacy(name);
        return old;
      } catch {
        return known.get(name) ?? null;
      }
    },

    async setItem(name: string, value: string): Promise<void> {
      await ensureInstalled(name);
      try {
        await keychain.set(name, value);
        known.set(name, value);
        await dropLegacy(name);
      } catch {
        // Leave what is stored where it is: this may be a locked device
        // rather than a bad value.
      }
    },

    async removeItem(name: string): Promise<void> {
      // Both, always: signing out has to clear the old place too.
      known.set(name, null);
      await keychain.remove(name).catch(() => undefined);
      legacyMayHold = true;
      await dropLegacy(name);
    },
  };
}
