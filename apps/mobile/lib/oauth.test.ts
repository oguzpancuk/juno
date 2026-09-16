import { describe, expect, it } from 'vitest';
import {
  availability,
  googleClientIdSchema,
  reversedClientId,
  tokenOutcome,
} from './oauth';

const CLIENT_ID = '123456789012-abcdefghijklmnop.apps.googleusercontent.com';

describe('googleClientIdSchema', () => {
  it('takes a client ID as Google Cloud writes it', () => {
    expect(googleClientIdSchema.safeParse(CLIENT_ID).success).toBe(true);
  });

  it('refuses the things that get pasted instead', () => {
    for (const wrong of [
      '', // nothing set
      '123456789012', // the project number alone
      'com.googleusercontent.apps.123456789012-abcdefghijklmnop', // the scheme
      '123456789012-abc.apps.googleusercontent.com ', // a trailing space
      'GOCSPX-abcdefghijklmnopqrstuvwx', // the client SECRET, which must
      // never reach the app at all
    ]) {
      expect(googleClientIdSchema.safeParse(wrong).success).toBe(false);
    }
  });
});

describe('reversedClientId', () => {
  it('swaps the halves the way the downloaded plist does', () => {
    expect(reversedClientId(CLIENT_ID)).toBe(
      'com.googleusercontent.apps.123456789012-abcdefghijklmnop',
    );
  });

  it('throws rather than build a scheme out of nonsense', () => {
    // The failure it replaces is mute: iOS registers a scheme nothing
    // calls back on, and the Google sheet simply never returns.
    expect(() => reversedClientId('nope')).toThrow();
  });
});

describe('tokenOutcome', () => {
  const MESSAGE = 'giriş tamamlanamadı';

  it('hands a token on to be exchanged', () => {
    expect(tokenOutcome({ token: 'eyJhbGciOi' }, MESSAGE)).toEqual({
      status: 'exchange',
      token: 'eyJhbGciOi',
    });
  });

  it('says nothing about a sheet the person closed', () => {
    expect(tokenOutcome({ token: null, cancelled: true }, MESSAGE)).toEqual({
      status: 'cancelled',
    });
  });

  it('does not let an empty credential pass as a cancellation', () => {
    // A sheet that completed and produced no token. Reported as a
    // cancellation it would draw nothing at all — a provider button that
    // does nothing, which is the state this whole feature replaced.
    expect(tokenOutcome({ token: null, cancelled: false }, MESSAGE)).toEqual({
      status: 'failed',
      message: MESSAGE,
    });
  });
});

describe('availability', () => {
  const base = { appleNative: true, googleConfigured: true };

  it('shows both on an iOS device that has them', () => {
    expect(availability({ ...base, platform: 'ios' })).toEqual({
      apple: true,
      google: true,
    });
  });

  it('hides Apple where the device does not offer it', () => {
    expect(
      availability({ ...base, platform: 'ios', appleNative: false }),
    ).toEqual({ apple: false, google: true });
  });

  it('hides Apple off iOS, where no route to it is wired yet', () => {
    for (const platform of ['android', 'web']) {
      expect(availability({ ...base, platform }).apple).toBe(false);
    }
  });

  it('hides Google in a build with no client ID', () => {
    for (const platform of ['ios', 'android', 'web']) {
      expect(
        availability({ ...base, platform, googleConfigured: false }).google,
      ).toBe(false);
    }
  });

  it('can end with no provider at all, and says so plainly', () => {
    expect(
      availability({
        platform: 'web',
        appleNative: false,
        googleConfigured: false,
      }),
    ).toEqual({ apple: false, google: false });
  });
});
