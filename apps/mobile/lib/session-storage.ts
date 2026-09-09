import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { sealedStore, type Keychain, type Store } from './session-store';

/**
 * Where the Supabase session lives.
 *
 * On a device: sealed in AsyncStorage, with the key in the keychain.
 * AsyncStorage is a plain SQLite file in the app sandbox, so a refresh
 * token stored there is readable by anyone who reaches the file system —
 * a jailbreak, a backup, a lab tool. The session itself cannot go in the
 * keychain: SecureStore caps a value at 2 KB and a session is larger. So
 * the key goes there and the session goes to AsyncStorage sealed.
 *
 * On the web: the browser's own storage, untouched. There is no keychain,
 * and a key sitting beside the ciphertext in the same origin protects
 * nothing; a web session is as safe as the browser profile, which is what
 * every web app already assumes.
 *
 * This file is the binding. The logic, and its tests, are in
 * `session-store.ts`.
 */

const KEY_NAME = 'juno.session.key.v1';

/**
 * `WHEN_UNLOCKED`: a token refresh in the foreground needs the key, and
 * nothing needs it while the phone is locked and cold.
 */
const keychain: Keychain = {
  get: (name) =>
    SecureStore.getItemAsync(name, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    }),
  set: (name, value) =>
    SecureStore.setItemAsync(name, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    }),
};

const plain: Store = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export const sessionStorage: Store =
  Platform.OS === 'web'
    ? plain
    : sealedStore({
        keychain,
        store: plain,
        randomBytes: (size) => Crypto.getRandomBytes(size),
        keyName: KEY_NAME,
      });
