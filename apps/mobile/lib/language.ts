import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage as setEngineLanguage, type Language } from '@juno/astro';
import { useSyncExternalStore } from 'react';
import { Platform, Settings } from 'react-native';
import { LOCALE_TAGS, SHORT_DATE } from './i18n';
import {
  parsePreference,
  resolveLanguage,
  type LanguagePreference,
} from './language-choice';
import { setStringsLanguage } from './strings';

/**
 * The language the app is showing, and the one place that changes it.
 *
 * Three things follow it and nothing else sets them: the UI catalog
 * (`t` in `lib/strings.ts`), the chart engine's texts (`setLanguage` in
 * `@juno/astro`), and on the web the page's `<html lang>`, which is what
 * a screen reader and the browser's own translate offer go by.
 *
 * The device's language is read synchronously, at import, so the first
 * frame is already in it; a choice stored in settings is read once at
 * start (`loadLanguage`), before the splash lifts.
 */

const STORAGE_KEY = 'juno.language.v1';

/** The device's languages, most preferred first. */
function deviceTags(): string[] {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined') return [];
    return [...(navigator.languages ?? []), navigator.language].filter(
      (tag): tag is string => typeof tag === 'string',
    );
  }
  if (Platform.OS === 'ios') {
    // The iPhone's language list, with a per-app language chosen in the
    // system Settings first — read from the app's defaults, where iOS
    // puts both.
    const list: unknown = Settings.get('AppleLanguages');
    if (Array.isArray(list))
      return list.filter((tag): tag is string => typeof tag === 'string');
  }
  return [Intl.DateTimeFormat().resolvedOptions().locale];
}

interface State {
  readonly preference: LanguagePreference;
  readonly language: Language;
  /** Whether the stored choice has been read; the splash waits for it. */
  readonly loaded: boolean;
}

let state: State = {
  preference: 'device',
  language: resolveLanguage('device', deviceTags()),
  loaded: false,
};
const listeners = new Set<() => void>();

function apply(next: State): void {
  setStringsLanguage(next.language);
  setEngineLanguage(next.language);
  if (Platform.OS === 'web' && typeof document !== 'undefined')
    document.documentElement.lang = next.language;
  state = next;
  for (const listener of listeners) listener();
}

apply(state);

// A browser's language list can change while the page is open; a member
// following the device follows it. (An iPhone restarts the app when its
// language changes.)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    if (state.preference !== 'device') return;
    const language = resolveLanguage('device', deviceTags());
    if (language !== state.language) apply({ ...state, language });
  });
}

/** Read the stored choice once; a failed read keeps following the device. */
export async function loadLanguage(): Promise<void> {
  if (state.loaded) return;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    // why: storage that cannot be read is a device to follow, not a crash
  }
  const preference = parsePreference(raw);
  apply({
    preference,
    language: resolveLanguage(preference, deviceTags()),
    loaded: true,
  });
}

/** The member's pick in settings: store it, then show it. */
export async function chooseLanguage(
  preference: LanguagePreference,
): Promise<void> {
  try {
    if (preference === 'device') await AsyncStorage.removeItem(STORAGE_KEY);
    else await AsyncStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // why: an unsaved pick still applies now; it is only forgotten later
  }
  apply({
    preference,
    language: resolveLanguage(preference, deviceTags()),
    loaded: true,
  });
}

export function useLanguage(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** A short date as the current language writes it: "29.09.2026", "Sep 29, 2026". */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(
    LOCALE_TAGS[state.language],
    SHORT_DATE[state.language],
  );
}
