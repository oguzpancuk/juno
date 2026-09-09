import { beforeEach, describe, expect, it } from 'vitest';
import { keychainStore, type Keychain, type Store } from './session-store';

const NAME = 'sb-127-auth-token';
const SESSION = JSON.stringify({
  access_token: 'a'.repeat(800),
  refresh_token: 'r'.repeat(40),
  user: { id: '00000000-0000-4000-8000-000000000001' },
});

class FakeKeychain implements Keychain {
  readonly entries = new Map<string, string>();
  failing: 'none' | 'get' | 'set' = 'none';
  async get(name: string) {
    if (this.failing === 'get') throw new Error('device locked');
    return this.entries.get(name) ?? null;
  }
  async set(name: string, value: string) {
    if (this.failing === 'set') throw new Error('device locked');
    this.entries.set(name, value);
  }
  async remove(name: string) {
    this.entries.delete(name);
  }
}

class FakeStore implements Store {
  readonly items = new Map<string, string>();
  failRemove = false;
  async getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  async removeItem(key: string) {
    if (this.failRemove) throw new Error('storage unavailable');
    this.items.delete(key);
  }
}

let keychain: FakeKeychain;
let legacy: FakeStore;
const make = () => keychainStore({ keychain, legacy });

beforeEach(() => {
  keychain = new FakeKeychain();
  legacy = new FakeStore();
});

describe('keychainStore', () => {
  it('keeps the session in the keychain, not in the plain store', async () => {
    const store = make();
    await store.setItem(NAME, SESSION);
    expect(keychain.entries.get(NAME)).toBe(SESSION);
    expect(legacy.items.size).toBe(0);
  });

  it('reads back what it wrote across instances', async () => {
    // A fresh pair of objects is what an app launch looks like.
    await make().setItem(NAME, SESSION);
    expect(await make().getItem(NAME)).toBe(SESSION);
  });

  it('moves a session left behind by the old build', async () => {
    // The upgrade path: signed in under a build that used AsyncStorage.
    legacy.items.set(NAME, SESSION);
    expect(await make().getItem(NAME)).toBe(SESSION);
    expect(keychain.entries.get(NAME)).toBe(SESSION);
    // And the clear-text copy is gone, which is the point of the change.
    expect(legacy.items.has(NAME)).toBe(false);
  });

  it('clears a clear-text leftover even when the keychain already has one', async () => {
    keychain.entries.set(NAME, SESSION);
    legacy.items.set(NAME, 'stale-but-live');
    expect(await make().getItem(NAME)).toBe(SESSION);
    expect(legacy.items.has(NAME)).toBe(false);
  });

  it('clears both places on sign-out', async () => {
    keychain.entries.set(NAME, SESSION);
    legacy.items.set(NAME, SESSION);
    await make().removeItem(NAME);
    expect(keychain.entries.size).toBe(0);
    expect(legacy.items.size).toBe(0);
  });

  it('answers null when the keychain cannot be read', async () => {
    keychain.entries.set(NAME, SESSION);
    keychain.failing = 'get';
    expect(await make().getItem(NAME)).toBeNull();
  });

  it('keeps a stored session when a write fails', async () => {
    // A locked device is not a reason to sign someone out.
    const store = make();
    await store.setItem(NAME, SESSION);
    keychain.failing = 'set';
    await expect(store.setItem(NAME, 'newer')).resolves.toBeUndefined();
    expect(keychain.entries.get(NAME)).toBe(SESSION);
  });

  it('does not throw when the old store refuses', async () => {
    legacy.failRemove = true;
    const store = make();
    await expect(store.setItem(NAME, SESSION)).resolves.toBeUndefined();
    expect(keychain.entries.get(NAME)).toBe(SESSION);
    await expect(store.removeItem(NAME)).resolves.toBeUndefined();
  });

  it('answers null when there is nothing anywhere', async () => {
    expect(await make().getItem(NAME)).toBeNull();
  });
});
