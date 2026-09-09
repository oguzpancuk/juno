import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { keychainStore, type Keychain, type Store } from './session-store';

/**
 * The binding: the real keychain and the real AsyncStorage. The logic,
 * and its tests, are in `session-store.ts`.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` rather than `WHEN_UNLOCKED`: the
 * second is carried into an encrypted backup, so restoring that backup
 * onto another device hands over the refresh token — one of the threats
 * this change exists to answer. The cost is a sign-in after a legitimate
 * device migration, which is the right way round for a credential.
 *
 * On the web there is no keychain, so the browser's own storage stands.
 * A session there is as safe as the browser profile, which is what every
 * web app already assumes; pretending otherwise would be theatre.
 */

const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const keychain: Keychain = {
  get: (name: string) => SecureStore.getItemAsync(name, options),
  set: (name: string, value: string) =>
    SecureStore.setItemAsync(name, value, options),
  remove: (name: string) => SecureStore.deleteItemAsync(name, options),
};

const asyncStorage: Store = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const sessionStorage: Store =
  Platform.OS === 'web'
    ? asyncStorage
    : keychainStore({ keychain, legacy: asyncStorage });
