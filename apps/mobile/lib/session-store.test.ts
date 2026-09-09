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
  async remove(name: string) {
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
    // And the install is marked, so the next launch keeps its session.
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

  it('does not wipe when the marker cannot be written', async () => {
    // Otherwise an unwritable store signs the person out on every launch:
    // the check can never record that it ran.
    keychain.entries.set(NAME, SESSION);
    legacy.failSet = true;
    const fresh = keychainStore({ keychain, legacy, installMarker: MARKER });
    expect(await fresh.getItem(NAME)).toBe(SESSION);
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

  it('answers null when there is nothing anywhere', async () => {
    expect(await make().getItem(NAME)).toBeNull();
  });
});
