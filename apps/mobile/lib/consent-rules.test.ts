import { describe, expect, it } from 'vitest';
import { LEGAL_VERSION } from './legal';
import {
  ConsentVersionSchema,
  needsConsent,
  returnPath,
  stoppedAt,
} from './consent-rules';

describe('re-consent', () => {
  it('asks a member whose accepted version is older than the current one', () => {
    expect(needsConsent('2026-09-17', '2026-09-30')).toBe(true);
    // Versions are dates, and a month boundary is where a string compare
    // of a non-padded form would go wrong.
    expect(needsConsent('2026-09-30', '2026-10-01')).toBe(true);
  });

  it('lets through a member who accepted the current version', () => {
    expect(needsConsent('2026-09-30', '2026-09-30')).toBe(false);
  });

  it('lets through a member who accepted a newer version than this build carries', () => {
    // A phone on an older bundle, after the member accepted a newer text
    // on the web: asking them to "accept" the older one would be asking
    // for a version the database refuses to move back to.
    expect(needsConsent('2026-10-01', '2026-09-30')).toBe(false);
  });

  it('asks everyone who accepted before the location purpose widened', () => {
    // Showing the distance to people you liked (#14, the 2026-09-28 text)
    // widened what location is processed for; consent given to an older
    // text does not cover it.
    for (const version of ['2026-09-09', '2026-09-17', '2026-09-21'])
      expect(needsConsent(version, LEGAL_VERSION), version).toBe(true);
  });

  it('reads the version the way the database sends a date column', () => {
    expect(ConsentVersionSchema.parse('2026-09-30')).toBe('2026-09-30');
    for (const bad of ['30.09.2026', '2026-9-30', '', 'kabul'])
      expect(ConsentVersionSchema.safeParse(bad).success, bad).toBe(false);
  });
});

describe('where accepting returns to', () => {
  it('returns to a path inside the app', () => {
    expect(returnPath('/chat/abc')).toBe('/chat/abc');
    expect(returnPath('/profile')).toBe('/profile');
  });

  it("keeps the match detail's page", () => {
    // The Uyum page is the chat route with `?page=match`
    // (`matchDetailHref`); without it the member lands on the thread.
    expect(returnPath('/chat/abc?page=match')).toBe('/chat/abc?page=match');
    expect(stoppedAt('/chat/abc', 'match')).toBe('/chat/abc?page=match');
    // Any other page, or none, is the path alone.
    expect(stoppedAt('/chat/abc', undefined)).toBe('/chat/abc');
    expect(stoppedAt('/profile', ['match'])).toBe('/profile');
  });

  it('falls back to the deck for anything else', () => {
    // The param arrives in a URL anyone can type: it must not become a
    // way off the site, or a loop back to the consent screen itself.
    for (const raw of [
      undefined,
      '',
      'chat/abc',
      '//evil.example/x',
      '/\\evil.example',
      'https://evil.example',
      '/consent',
      '/consent?next=/x',
      '/chat/abc?page=other',
      '/chat/abc?page=match&next=//evil.example',
      '/discover?page=match',
      '/sign-in',
      '/onboarding',
      '/',
      ['/chat/a', '/chat/b'],
    ])
      expect(returnPath(raw), JSON.stringify(raw)).toBe('/discover');
  });
});
