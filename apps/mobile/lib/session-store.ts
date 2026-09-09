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
 *
 * supabase-js writes several keys through here — the session, the user, a
 * PKCE verifier — and nothing promises which arrives first, so every rule
 * below is per key rather than "whichever came first".
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
   * to move an old session across, and cleared whenever a value is
   * written or dropped: an install that upgrades must not leave a live
   * refresh token behind in clear text.
   */
  readonly legacy: Store;
  /** Marks that this install has run before. See `checkInstall`. */
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
   * The last value this process knows to be stored, per key. A null here
   * is not "unknown", it is "known to be gone".
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
   * Counts values that actually landed, so a delete in flight can tell
   * that something newer than itself was stored. A write that failed does
   * not count: the restore below replays what is in `known`, and replaying
   * a value nothing stored would resurrect a session the user just ended.
   */
  const writes = new Map<string, number>();
  const bump = (name: string): void => {
    writes.set(name, (writes.get(name) ?? 0) + 1);
  };

  /** Keys whose deletion has not gone through. Reads answer null. */
  const pendingRemoval = new Set<string>();

  /**
   * Delete, and if the keychain refuses, remember that this key is meant
   * to be gone: a read that handed the value back would let a concurrent
   * refresh write rotated tokens straight back and undo the sign-out.
   * A write that lands while the delete is in flight wins — it is newer
   * than the intent to delete.
   */
  const forget = async (name: string): Promise<void> => {
    const at = writes.get(name) ?? 0;
    try {
      await keychain.remove(name);
    } catch {
      if ((writes.get(name) ?? 0) === at) pendingRemoval.add(name);
      return;
    }
    if ((writes.get(name) ?? 0) === at) {
      pendingRemoval.delete(name);
      return;
    }
    // A write landed while this delete was in flight, and the delete
    // removed it. Put it back rather than leaving the person signed out
    // by a race they cannot see.
    const newer = known.get(name);
    if (typeof newer === 'string') {
      await keychain.set(name, newer).catch(() => undefined);
    }
  };

  /**
   * An iOS keychain entry outlives the app that wrote it: delete Juno,
   * reinstall it, and the old session is still there — someone who wiped
   * the app to get out of an account, or the next owner of a resold
   * phone, lands inside it without signing in. AsyncStorage does go with
   * the app, so its emptiness is the signal: no marker means this install
   * has never run, and any keychain entry belongs to a previous one.
   *
   * The marker is written when this install first stores something of its
   * own — a sign-in — not when a wipe succeeds. Marking on a wipe made
   * the whole guarantee depend on which key supabase-js happens to touch
   * first: a launch that only touched, say, a PKCE verifier would mark
   * the install while the previous owner's session sat untouched. Until
   * this install has written something, every key is cleared the first
   * time it is used, whatever the order. The cost is that an install
   * where nobody signs in checks again next launch, which costs nothing.
   */
  let freshInstall: Promise<boolean> | null = null;
  /**
   * False while the check has not managed to read the plain store. A
   * launch that never learned whether the install was fresh must not
   * write the marker: doing so cements "this install has run" on the
   * strength of a failed read, and every later launch then skips the
   * check for good — on a resold phone, for good means for ever.
   */
  let installStateKnown = false;
  const checkInstall = async (): Promise<boolean> => {
    try {
      const fresh = (await legacy.getItem(installMarker)) === null;
      installStateKnown = true;
      return fresh;
    } catch {
      // Cannot tell: do not wipe a session on a guess.
      return false;
    }
  };

  let marked = false;
  const mark = async (): Promise<void> => {
    if (marked || !installStateKnown) return;
    try {
      await legacy.setItem(installMarker, '1');
      marked = true;
    } catch {
      // Retried on the next call; until then the check runs again.
    }
  };

  /**
   * One wipe per key, shared by every caller that arrives during it.
   *
   * Only the key being asked for: an earlier version guessed the other
   * keys supabase-js derives from it, parsed one of them wrongly, and
   * ended up deleting this install's own session. Every key is cleared
   * the first time this install uses it, in any order, until the install
   * marks itself by storing something.
   */
  const wipes = new Map<string, Promise<void>>();
  const wipe = async (name: string): Promise<void> => {
    try {
      await keychain.remove(name);
    } catch {
      // Reads answer null until the delete goes through.
      pendingRemoval.add(name);
    }
  };
  const ensureInstalled = async (name: string): Promise<void> => {
    // No short-circuit once the install is marked: a key this launch has
    // not touched yet may still hold a previous install's value, and the
    // per-key `wipes` map is what keeps our own keys safe — every key
    // this install writes passed through here before it was written.
    freshInstall ??= checkInstall();
    if (!(await freshInstall)) return;
    let running = wipes.get(name);
    if (running === undefined) {
      running = wipe(name);
      wipes.set(name, running);
    }
    await running;
  };

  /** Per key: the clear-text copy is gone once, and not chased after. */
  const legacyCleared = new Set<string>();
  const dropLegacy = async (name: string): Promise<void> => {
    if (legacyCleared.has(name)) return;
    try {
      await legacy.removeItem(name);
      legacyCleared.add(name);
    } catch {
      // Try again on the next call rather than reporting a failure.
    }
  };

  return {
    async getItem(name: string): Promise<string | null> {
      await ensureInstalled(name);
      if (pendingRemoval.has(name)) {
        await forget(name);
        await dropLegacy(name);
        // Nothing to hand back: a write would have cleared the pending
        // state, so reaching here means the value is meant to be gone.
        return null;
      }
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
      // Known to be gone, not merely absent: a sign-out whose clear-text
      // delete failed must not be undone by reading the leftover back.
      if (known.get(name) === null) {
        await dropLegacy(name);
        return null;
      }
      // The move: an install that signed in under the old build.
      try {
        const old = await legacy.getItem(name);
        if (old === null) {
          known.set(name, null);
          return null;
        }
        try {
          await keychain.set(name, old);
          known.set(name, old);
          // A migrated session came from this install's own store, so it
          // is ours: mark, or the next launch would wipe it as if it
          // belonged to a previous install.
          await mark();
          await dropLegacy(name);
        } catch {
          // The move failed, but the session is real and the next launch
          // will try again. Signing the person out here would be a worse
          // answer than leaving the clear-text copy one launch longer.
          known.set(name, old);
        }
        return old;
      } catch {
        return known.get(name) ?? null;
      }
    },

    async setItem(name: string, value: string): Promise<void> {
      await ensureInstalled(name);
      try {
        await keychain.set(name, value);
        bump(name);
        known.set(name, value);
        pendingRemoval.delete(name);
        // This install now owns what is stored, so the wipe stops here
        // and does not run again on the next launch.
        await mark();
        await dropLegacy(name);
      } catch {
        // Leave what is stored where it is: this may be a locked device
        // rather than a bad value.
      }
    },

    async removeItem(name: string): Promise<void> {
      known.set(name, null);
      await forget(name);
      // Both places, always: signing out has to clear the old one too.
      await dropLegacy(name);
    },
  };
}
