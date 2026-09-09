import { beforeEach, describe, expect, it } from 'vitest';
import { keychainStore, type Keychain, type Store } from './session-store';

const NAME = 'sb-127-auth-token';
const MARKER = 'juno.install.v1';
const SESSION = JSON.stringify({
  access_token: 'a'.repeat(800),
  refresh_token: 'r'.repeat(40),
  user: { id: '00000000-0000-4000-8000-000000000001' },
});

class FakeKeychain implements Keychain {
  readonly entries = new Map<string, string>();
  failing: 'none' | 'get' | 'set' | 'remove' = 'none';
  async get(name: string) {
    if (this.failing === 'get') throw new Error('device locked');
    return this.entries.get(name) ?? null;
  }
  async set(name: string, value: string) {
    if (this.failing === 'set') throw new Error('device locked');
    this.entries.set(name, value);
  }
  beforeRemove: (() => Promise<void>) | undefined;
  async remove(name: string) {
    if (this.beforeRemove) await this.beforeRemove();
    if (this.failing === 'remove') throw new Error('device locked');
    this.entries.delete(name);
  }
}

class FakeStore implements Store {
  readonly items = new Map<string, string>();
  failGet = false;
  failSet = false;
  failRemove = false;
  async getItem(key: string) {
    if (this.failGet) throw new Error('storage unavailable');
    return this.items.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    if (this.failSet) throw new Error('storage unavailable');
    this.items.set(key, value);
  }
  async removeItem(key: string) {
    if (this.failRemove) throw new Error('storage unavailable');
    this.items.delete(key);
  }
}

let keychain: FakeKeychain;
let legacy: FakeStore;
/** A store for an install that has run before, unless a test says otherwise. */
const make = () => {
  legacy.items.set(MARKER, '1');
  return keychainStore({ keychain, legacy, installMarker: MARKER });
};

beforeEach(() => {
  keychain = new FakeKeychain();
  legacy = new FakeStore();
});

describe('keychainStore', () => {
  it('keeps the session in the keychain, not in the plain store', async () => {
    const store = make();
    await store.setItem(NAME, SESSION);
    expect(keychain.entries.get(NAME)).toBe(SESSION);
    expect(legacy.items.get(NAME)).toBeUndefined();
  });

  it('reads back what it wrote across instances', async () => {
    // A fresh pair of objects is what an app launch looks like.
    await make().setItem(NAME, SESSION);
    expect(await make().getItem(NAME)).toBe(SESSION);
  });

  it('moves a session left behind by the old build', async () => {
    legacy.items.set(NAME, SESSION);
    expect(await make().getItem(NAME)).toBe(SESSION);
    expect(keychain.entries.get(NAME)).toBe(SESSION);
    // And the clear-text copy is gone, which is the point of the change.
    expect(legacy.items.has(NAME)).toBe(false);
  });

  it('reports the migrated session even if the old copy will not delete', async () => {
    legacy.items.set(NAME, SESSION);
    legacy.failRemove = true;
    // The keychain has it; saying "no session" here is a spurious
    // sign-out on the one launch that migrates.
    expect(await make().getItem(NAME)).toBe(SESSION);
    expect(keychain.entries.get(NAME)).toBe(SESSION);
  });

  it('clears a clear-text leftover on a write', async () => {
    legacy.items.set(NAME, 'stale-but-live');
    const store = make();
    await store.setItem(NAME, SESSION);
    expect(legacy.items.has(NAME)).toBe(false);
  });

  it('never falls back to the clear-text copy when the keychain fails', async () => {
    // The security property: an unreadable keychain must not make the app
    // reach for the token it was moved out of.
    legacy.items.set(NAME, SESSION);
    keychain.failing = 'get';
    expect(await make().getItem(NAME)).toBeNull();
  });

  it('answers with the last known session when a read fails', async () => {
    // supabase-js re-reads the store after rotating a refresh token and
    // treats null as "storage was cleared under us", throwing the new
    // tokens away. A locked phone mid-refresh must not do that.
    const store = make();
    await store.setItem(NAME, SESSION);
    keychain.failing = 'get';
    expect(await store.getItem(NAME)).toBe(SESSION);
  });

  it('clears both places on sign-out', async () => {
    keychain.entries.set(NAME, SESSION);
    legacy.items.set(NAME, SESSION);
    await make().removeItem(NAME);
    expect(keychain.entries.has(NAME)).toBe(false);
    expect(legacy.items.has(NAME)).toBe(false);
  });

  it('forgets the last known session on sign-out', async () => {
    const store = make();
    await store.setItem(NAME, SESSION);
    await store.removeItem(NAME);
    keychain.failing = 'get';
    expect(await store.getItem(NAME)).toBeNull();
  });

  it('does not throw when the keychain refuses to delete', async () => {
    keychain.failing = 'remove';
    await expect(make().removeItem(NAME)).resolves.toBeUndefined();
  });

  it('does not throw when the old store refuses to be read', async () => {
    legacy.failGet = true;
    const store = keychainStore({ keychain, legacy, installMarker: MARKER });
    await expect(store.getItem(NAME)).resolves.toBeNull();
  });

  it('keeps a stored session when a write fails', async () => {
    // A locked device is not a reason to sign someone out.
    const store = make();
    await store.setItem(NAME, SESSION);
    keychain.failing = 'set';
    await expect(store.setItem(NAME, 'newer')).resolves.toBeUndefined();
    expect(keychain.entries.get(NAME)).toBe(SESSION);
  });

  it('drops a session the keychain kept from a previous install', async () => {
    // An iOS keychain entry outlives the app. Without this, deleting the
    // app and reinstalling it — or selling the phone — lands the next
    // person inside the previous account.
    keychain.entries.set(NAME, SESSION);
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(NAME)).toBeNull();
    expect(keychain.entries.has(NAME)).toBe(false);
    // Not marked yet: the install owns nothing until it stores something,
    // and marking on a read would depend on which key came first.
    expect(legacy.items.get(MARKER)).toBeUndefined();
    await fresh.setItem(NAME, SESSION);
    expect(legacy.items.get(MARKER)).toBe('1');
  });

  it('keeps the session on the second launch of the same install', async () => {
    const first = keychainStore({ keychain, legacy, installMarker: MARKER });
    await first.setItem(NAME, SESSION);
    const second = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await second.getItem(NAME)).toBe(SESSION);
  });

  it('carries a session across the upgrade that introduces the marker', async () => {
    // The real upgrade: this build has never run, so there is no marker,
    // and the old build left a session in the plain store. Treating that
    // as a fresh install would sign out every existing user at once.
    legacy.items.set(NAME, SESSION);
    const store = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await store.getItem(NAME)).toBe(SESSION);
    expect(keychain.entries.get(NAME)).toBe(SESSION);
    expect(legacy.items.has(NAME)).toBe(false);
    expect(legacy.items.get(MARKER)).toBe('1');
  });

  it('drops every key a previous install left, not just the first', async () => {
    // supabase-js writes the session, the user and a PKCE verifier, and
    // nothing says which one arrives first.
    keychain.entries.set(NAME, SESSION);
    keychain.entries.set(`${NAME}-user`, '{"id":"x"}');
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(`${NAME}-user`)).toBeNull();
    expect(await fresh.getItem(NAME)).toBeNull();
    expect(keychain.entries.size).toBe(0);
  });

  it('clears the clear-text copy of every key, not just the first', async () => {
    // The cleanup used to stop after whichever key was cleaned first,
    // which left the session's own clear-text copy on disk for ever.
    legacy.items.set(`${NAME}-user`, '{"id":"x"}');
    legacy.items.set(NAME, SESSION);
    const store = make();
    expect(await store.getItem(`${NAME}-user`)).toBe('{"id":"x"}');
    expect(await store.getItem(NAME)).toBe(SESSION);
    expect(legacy.items.has(NAME)).toBe(false);
    expect(legacy.items.has(`${NAME}-user`)).toBe(false);
  });

  it('does not mark the install from a wipe, whichever key came first', async () => {
    // Marking on a wipe made the guarantee depend on which key
    // supabase-js touched first: a launch that only saw a PKCE verifier
    // marked the install while the previous session sat untouched.
    keychain.entries.set(NAME, SESSION);
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(`${NAME}-code-verifier`)).toBeNull();
    expect(legacy.items.get(MARKER)).toBeUndefined();
    expect(await fresh.getItem(NAME)).toBeNull();
    expect(keychain.entries.has(NAME)).toBe(false);
  });

  it('marks the install when a migrated session is stored', async () => {
    // A migrated session is this install's own; without the mark the next
    // launch would wipe it as a previous install's.
    legacy.items.set(NAME, SESSION);
    const store = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await store.getItem(NAME)).toBe(SESSION);
    expect(legacy.items.get(MARKER)).toBe('1');
    const next = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await next.getItem(NAME)).toBe(SESSION);
  });

  it('remembers a migrated session even when the keychain will not take it', async () => {
    // Losing the cache here would make a later failing read answer null,
    // which is the sign-out this cache exists to prevent.
    legacy.items.set(NAME, SESSION);
    keychain.failing = 'set';
    const store = make();
    expect(await store.getItem(NAME)).toBe(SESSION);
    keychain.failing = 'get';
    expect(await store.getItem(NAME)).toBe(SESSION);
  });

  it('lets a write that lands during a delete win', async () => {
    // The counter's one job: a delete already in flight must not re-arm
    // the pending state after a newer write.
    const store = make();
    let release: (() => void) | undefined;
    keychain.beforeRemove = () =>
      new Promise<void>((resolve) => {
        release = resolve;
      });
    const removing = store.removeItem(NAME);
    keychain.beforeRemove = undefined;
    await store.setItem(NAME, 'newer');
    release?.();
    await removing;
    expect(await store.getItem(NAME)).toBe('newer');
  });

  it('still wipes when the marker cannot be written', async () => {
    // The trade, stated: a plain store that cannot be written means the
    // check runs again on every launch, so this install keeps signing
    // itself out. That is the right way round — the other way leaves
    // someone else's account open on a resold phone for ever.
    keychain.entries.set(NAME, SESSION);
    legacy.failSet = true;
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(NAME)).toBeNull();
    expect(keychain.entries.has(NAME)).toBe(false);
    expect(legacy.items.get(MARKER)).toBeUndefined();
  });

  it('reads as signed out when the keychain will not delete', async () => {
    // A refresh running alongside the sign-out re-reads the store; if it
    // finds the session it writes rotated tokens back and undoes it.
    const store = make();
    await store.setItem(NAME, SESSION);
    keychain.failing = 'remove';
    await store.removeItem(NAME);
    expect(await store.getItem(NAME)).toBeNull();
    // And it keeps trying: once the keychain answers, the entry goes.
    keychain.failing = 'none';
    expect(await store.getItem(NAME)).toBeNull();
    expect(keychain.entries.has(NAME)).toBe(false);
  });

  it('retries a wipe the keychain refused, and reads as signed out meanwhile', async () => {
    // A transient refusal must not make the wipe permanent: writing the
    // marker anyway would leave a resold phone inside the old account for
    // the life of the install.
    keychain.entries.set(NAME, SESSION);
    keychain.failing = 'remove';
    const first = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await first.getItem(NAME)).toBeNull();
    expect(legacy.items.get(MARKER)).toBeUndefined();

    keychain.failing = 'none';
    const second = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await second.getItem(NAME)).toBeNull();
    expect(keychain.entries.has(NAME)).toBe(false);
  });

  it('wipes each key on its first touch, not the ones it guesses', async () => {
    // An earlier version tried to derive the other keys supabase-js
    // writes, parsed one of them wrongly, and deleted this install's own
    // session. Each key is cleared when it is first used instead.
    keychain.entries.set(NAME, SESSION);
    keychain.entries.set(`${NAME}-user`, '{"id":"x"}');
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(`${NAME}-user`)).toBeNull();
    expect(await fresh.getItem(NAME)).toBeNull();
    expect(keychain.entries.size).toBe(0);
  });

  it('does not wipe a session this install just signed in with', async () => {
    // The wipe is per key, and a key already seen is not wiped again —
    // otherwise touching a second key later deletes the live session.
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(NAME)).toBeNull();
    await fresh.setItem(NAME, SESSION);
    expect(await fresh.getItem(`${NAME}-user`)).toBeNull();
    expect(await fresh.getItem(NAME)).toBe(SESSION);
  });

  it('wipes a previous install session behind an unrelated first key', async () => {
    // The first key a launch touches may not be the session key.
    keychain.entries.set(NAME, SESSION);
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(`${NAME}-code-verifier`)).toBeNull();
    expect(await fresh.getItem(NAME)).toBeNull();
    expect(keychain.entries.has(NAME)).toBe(false);
  });

  it('does not wipe when it cannot tell whether the install is fresh', async () => {
    // An unreadable plain store is not evidence of a new install, and
    // wiping on a guess is a mass sign-out.
    keychain.entries.set(NAME, SESSION);
    legacy.failGet = true;
    const store = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await store.getItem(NAME)).toBe(SESSION);
    expect(keychain.entries.get(NAME)).toBe(SESSION);
  });

  it('keeps the migrated session when the keychain will not take it', async () => {
    // The move failed; the session is still real and the next launch
    // retries. Signing the person out here would be the worse answer.
    legacy.items.set(NAME, SESSION);
    keychain.failing = 'set';
    const store = make();
    expect(await store.getItem(NAME)).toBe(SESSION);
  });

  it('keeps a sign-in that lands while a refused delete is retried', async () => {
    // Sign out, the keychain refuses, sign back in, then a read runs the
    // retry: the delete is older than the sign-in and must not win.
    const store = make();
    await store.setItem(NAME, SESSION);
    keychain.failing = 'remove';
    await store.removeItem(NAME);
    keychain.failing = 'none';
    await store.setItem(NAME, 'newer-session');
    expect(await store.getItem(NAME)).toBe('newer-session');
    expect(keychain.entries.get(NAME)).toBe('newer-session');
  });

  it('does not read a signed-out session back out of the old store', async () => {
    // The clear-text copy survived because its delete failed; the
    // keychain is empty because the sign-out worked. Migrating it back
    // would undo the sign-out.
    legacy.items.set(NAME, SESSION);
    legacy.failRemove = true;
    const store = make();
    expect(await store.getItem(NAME)).toBe(SESSION);
    await store.removeItem(NAME);
    expect(await store.getItem(NAME)).toBeNull();
    expect(keychain.entries.has(NAME)).toBe(false);
  });

  it('remembers a session read from the keychain when a later read fails', async () => {
    // The launch that reads is the common case; the cache must be filled
    // there too, not only when this process wrote the value.
    keychain.entries.set(NAME, SESSION);
    const store = make();
    expect(await store.getItem(NAME)).toBe(SESSION);
    keychain.failing = 'get';
    expect(await store.getItem(NAME)).toBe(SESSION);
  });

  it('remembers a migrated session when a later read fails', async () => {
    legacy.items.set(NAME, SESSION);
    const store = make();
    expect(await store.getItem(NAME)).toBe(SESSION);
    keychain.failing = 'get';
    expect(await store.getItem(NAME)).toBe(SESSION);
  });

  it('clears a clear-text leftover on a later read', async () => {
    legacy.items.set(NAME, SESSION);
    legacy.failRemove = true;
    const store = make();
    expect(await store.getItem(NAME)).toBe(SESSION);
    expect(legacy.items.has(NAME)).toBe(true);
    legacy.failRemove = false;
    await store.getItem(NAME);
    expect(legacy.items.has(NAME)).toBe(false);
  });

  it('does not strand a key after a sign-in that follows a refused sign-out', async () => {
    const store = make();
    await store.setItem(NAME, SESSION);
    keychain.failing = 'remove';
    await store.removeItem(NAME);
    keychain.failing = 'none';
    await store.setItem(NAME, 'fresh');
    expect(await store.getItem(NAME)).toBe('fresh');
  });

  it('answers null when there is nothing anywhere', async () => {
    expect(await make().getItem(NAME)).toBeNull();
  });
});
