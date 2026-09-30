import { describe, expect, it } from 'vitest';
import {
  FALLBACK_LANGUAGE,
  languageOfTag,
  parsePreference,
  resolveLanguage,
} from './language-choice';

describe('which language the app shows', () => {
  it('follows the first device language it has a catalog for', () => {
    expect(resolveLanguage('device', ['en-GB', 'tr-TR'])).toBe('en');
    expect(resolveLanguage('device', ['de-DE', 'en-US', 'tr-TR'])).toBe('en');
    expect(resolveLanguage('device', ['tr_TR'])).toBe('tr');
  });

  it('falls back to English when the device names none it has', () => {
    // Owner, 2026-09-30: "cihaz dili bilinmediğinde default dil
    // İngilizce olsun".
    expect(resolveLanguage('device', ['de-DE', 'fr-FR'])).toBe('en');
    expect(resolveLanguage('device', [])).toBe('en');
    expect(FALLBACK_LANGUAGE).toBe('en');
  });

  it('lets a chosen language win over the device', () => {
    expect(resolveLanguage('tr', ['en-US'])).toBe('tr');
    expect(resolveLanguage('en', ['tr-TR'])).toBe('en');
  });

  it('reads a stored choice, and anything else as following the device', () => {
    expect(parsePreference('en')).toBe('en');
    expect(parsePreference('device')).toBe('device');
    expect(parsePreference(null)).toBe('device');
    expect(parsePreference('klingon')).toBe('device');
    expect(parsePreference('')).toBe('device');
  });

  it('takes the language from a tag’s first subtag only', () => {
    expect(languageOfTag('EN-us')).toBe('en');
    expect(languageOfTag('tr')).toBe('tr');
    expect(languageOfTag('eng')).toBeNull();
    expect(languageOfTag('')).toBeNull();
  });
});
