import { beforeEach, describe, expect, it } from 'vitest';
import { KEY_BYTES } from './session-crypto';
import {
  sealedStore,
  toBase64,
  type Keychain,
  type Store,
} from './session-store';

const KEY_NAME = 'juno.session.key.v1';
const SESSION = JSON.stringify({
  refresh_token: 'r'.repeat(40),
  user: { id: '00000000-0000-4000-8000-000000000001' },
});

class FakeKeychain implements Keychain {
  readonly entries = new Map<string, string>();
  failSet = false;
  async get(name: string) {
    return this.entries.get(name) ?? null;
  }
  async set(name: string, value: string) {
    if (this.failSet) throw new Error('keychain unavailable');
    this.entries.set(name, value);
  }
}

class FakeStore implements Store {
  readonly items = new Map<string, string>();
  async getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  async removeItem(key: string) {
    this.items.delete(key);
  }
}

let keychain: FakeKeychain;
let store: FakeStore;
let counter: number;

const randomBytes = (size: number) => new Uint8Array(size).fill(++counter);
const make = () =>
  sealedStore({ keychain, store, randomBytes, keyName: KEY_NAME });

beforeEach(() => {
  keychain = new FakeKeychain();
  store = new FakeStore();
  counter = 0;
});

describe('sealedStore', () => {
  it('reads back what it wrote', async () => {
    const sealed = make();
    await sealed.setItem('session', SESSION);
    expect(await sealed.getItem('session')).toBe(SESSION);
  });

  it('keeps the token out of the store', async () => {
    // The point of the whole exercise: AsyncStorage is a plain file.
    const sealed = make();
    await sealed.setItem('session', SESSION);
    const written = store.items.get('session') ?? '';
    expect(written).not.toContain('refresh_token');
    expect(written).not.toContain('r'.repeat(40));
    expect(written.length).toBeGreaterThan(0);
  });

  it('keeps the key in the keychain and nowhere else', async () => {
    const sealed = make();
    await sealed.setItem('session', SESSION);
    const key = keychain.entries.get(KEY_NAME);
    expect(key).toBeDefined();
    expect(store.items.get('session')).not.toContain(key ?? 'unset');
  });

  it('survives a restart: a new store instance opens the same value', async () => {
    await make().setItem('session', SESSION);
    // Same keychain and same file, fresh objects — an app launch.
    expect(await make().getItem('session')).toBe(SESSION);
  });

  it('answers null when the keychain entry is gone', async () => {
    await make().setItem('session', SESSION);
    keychain.entries.delete(KEY_NAME);
    expect(await make().getItem('session')).toBeNull();
  });

  it('answers null for a value it cannot open', async () => {
    await make().setItem('session', SESSION);
    store.items.set('session', 'tampered');
    expect(await make().getItem('session')).toBeNull();
  });

  it('replaces a key of the wrong size instead of failing for ever', async () => {
    keychain.entries.set(KEY_NAME, toBase64(new Uint8Array(8).fill(3)));
    const sealed = make();
    await sealed.setItem('session', SESSION);
    expect(await sealed.getItem('session')).toBe(SESSION);
    expect(keychain.entries.get(KEY_NAME)).toHaveLength(
      toBase64(new Uint8Array(KEY_BYTES)).length,
    );
  });

  it('stores nothing rather than throwing when the keychain refuses', async () => {
    keychain.failSet = true;
    const sealed = make();
    await expect(sealed.setItem('session', SESSION)).resolves.toBeUndefined();
    expect(store.items.get('session')).toBeUndefined();
  });

  it('forgets on removal', async () => {
    const sealed = make();
    await sealed.setItem('session', SESSION);
    await sealed.removeItem('session');
    expect(await sealed.getItem('session')).toBeNull();
    expect(store.items.size).toBe(0);
  });

  it('asks the keychain once, not on every read', async () => {
    let reads = 0;
    const counting: Keychain = {
      get: async (name) => {
        reads++;
        return keychain.get(name);
      },
      set: (name, value) => keychain.set(name, value),
    };
    const sealed = sealedStore({
      keychain: counting,
      store,
      randomBytes,
      keyName: KEY_NAME,
    });
    await sealed.setItem('session', SESSION);
    await sealed.getItem('session');
    await sealed.getItem('session');
    expect(reads).toBe(1);
  });
});
