import { describe, expect, it } from 'vitest';
import {
  accountNote,
  openedByProvider,
  appleServicesIdSchema,
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

// The shape of the client secret Supabase's generator prints: ES256 header
// with the key ID, Team ID as issuer, the Services ID as subject.
const APPLE_SECRET = [
  'eyJhbGciOiJFUzI1NiIsImtpZCI6IkFCQ0RFMTIzNDUifQ',
  'eyJpc3MiOiJURUFNMTIzNDU2IiwiaWF0IjoxNzkwMDAwMDAwLCJleHAiOjE4MDUwMDAwMDAsImF1ZCI6Imh0dHBzOi8vYXBwbGVpZC5hcHBsZS5jb20iLCJzdWIiOiJjb20ub2d1enBhbmN1ay5qdW5vLndlYiJ9',
  'x'.repeat(86),
].join('.');

describe('appleServicesIdSchema', () => {
  it('takes a Services ID as Apple Developer writes it', () => {
    expect(
      appleServicesIdSchema.safeParse('com.oguzpancuk.juno.web').success,
    ).toBe(true);
  });

  it('refuses the things that get pasted instead', () => {
    for (const wrong of [
      '', // nothing set
      'ABCDE12345', // the Team ID, or the key ID beside it
      'com.oguzpancuk.juno.web ', // a trailing space
      'https://www.juno-dating.com', // the domain the page asks for
      // The client SECRET: a JWT signed with the .p8 key. It belongs in
      // the Supabase dashboard only; in an EXPO_PUBLIC_ variable it would
      // ship to every browser that loads the site. A real one, and a short
      // one whose three parts would each pass for a label.
      APPLE_SECRET,
      'eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJ0In0.c2ln',
      '-----BEGIN PRIVATE KEY-----', // the key file itself
    ]) {
      expect(appleServicesIdSchema.safeParse(wrong).success).toBe(false);
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

  it('treats an empty token as nothing came back, never as a token', () => {
    expect(tokenOutcome({ token: '' }, MESSAGE)).toEqual({
      status: 'failed',
      message: MESSAGE,
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
  const base = {
    appleNative: true,
    appleWebConfigured: true,
    googleConfigured: true,
  };

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

  it('leaves the iPhone to the device, whatever the web build carries', () => {
    // The Services ID is the browser's route; the phone never uses it.
    expect(
      availability({ ...base, platform: 'ios', appleWebConfigured: false })
        .apple,
    ).toBe(true);
  });

  it('shows Apple on the web once the build names a Services ID', () => {
    // Owner, 2026-09-29: "webde apple girisi yok".
    expect(availability({ ...base, platform: 'web' })).toEqual({
      apple: true,
      google: true,
    });
  });

  it('hides Apple on the web in a build with no Services ID', () => {
    // A button whose page answers "invalid_client" is the state
    // `availability` exists to prevent.
    expect(
      availability({ ...base, platform: 'web', appleWebConfigured: false })
        .apple,
    ).toBe(false);
  });

  it('hides Apple on Android, where no route to it is wired yet', () => {
    expect(availability({ ...base, platform: 'android' }).apple).toBe(false);
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
        appleWebConfigured: false,
        googleConfigured: false,
      }),
    ).toEqual({ apple: false, google: false });
  });
});

describe('accountNote', () => {
  const meta = (providers: string[]) => ({
    provider: providers[0],
    providers,
  });

  it('says nothing to an account opened with e-mail', () => {
    expect(
      accountNote({ email: 'a@example.com', appMetadata: meta(['email']) }),
    ).toBeNull();
  });

  it('says nothing once Apple or Google was linked onto an e-mail account', () => {
    // The same-address case: Supabase linked it, so this is the member's
    // own account and there is nothing to warn about.
    for (const linked of [
      ['email', 'apple'],
      ['email', 'google'],
      ['email', 'apple', 'google'],
    ]) {
      expect(
        accountNote({ email: 'a@example.com', appMetadata: meta(linked) }),
      ).toBeNull();
    }
  });

  it('names the provider and the address of an account a provider opened', () => {
    expect(
      accountNote({ email: 'a@gmail.com', appMetadata: meta(['google']) }),
    ).toEqual({ kind: 'provider', provider: 'google', email: 'a@gmail.com' });
    expect(
      accountNote({ email: 'a@icloud.com', appMetadata: meta(['apple']) }),
    ).toEqual({ kind: 'provider', provider: 'apple', email: 'a@icloud.com' });
  });

  it('does not print an Apple relay address as though it were theirs', () => {
    expect(
      accountNote({
        email: 'x7k2m9q4ab@privaterelay.appleid.com',
        appMetadata: meta(['apple']),
      }),
    ).toEqual({ kind: 'relay' });
    // Addresses are case-insensitive, and so is the check.
    expect(
      accountNote({
        email: 'X7K2@PrivateRelay.AppleID.com',
        appMetadata: meta(['apple']),
      }),
    ).toEqual({ kind: 'relay' });
  });

  it("calls a relay address Apple's only when Apple opened the account", () => {
    // A Google account can be registered on an Apple relay address; telling
    // that person Apple hid their e-mail would name the wrong provider.
    expect(
      accountNote({
        email: 'x7k2m9q4ab@privaterelay.appleid.com',
        appMetadata: meta(['google']),
      }),
    ).toEqual({
      kind: 'provider',
      provider: 'google',
      email: 'x7k2m9q4ab@privaterelay.appleid.com',
    });
  });

  it('falls back to the opening provider when the list is missing', () => {
    expect(
      accountNote({
        email: 'a@gmail.com',
        appMetadata: { provider: 'google' },
      }),
    ).toEqual({ kind: 'provider', provider: 'google', email: 'a@gmail.com' });
    expect(
      accountNote({
        email: 'a@example.com',
        appMetadata: { provider: 'email' },
      }),
    ).toBeNull();
  });

  it('says nothing it cannot back up', () => {
    for (const input of [
      { email: undefined, appMetadata: meta(['google']) },
      { email: '', appMetadata: meta(['google']) },
      { email: 'a@gmail.com', appMetadata: undefined },
      { email: 'a@gmail.com', appMetadata: { providers: 'google' } },
      { email: 'a@gmail.com', appMetadata: meta(['github']) },
    ]) {
      expect(accountNote(input)).toBeNull();
    }
  });
});

describe('openedByProvider', () => {
  it('is true for an account Apple or Google opened, whatever else is missing', () => {
    // The delete on leaving onboarding must not depend on the note: an
    // account with no address to print is still one a provider opened.
    expect(openedByProvider({ provider: 'apple', providers: ['apple'] })).toBe(
      true,
    );
    expect(openedByProvider({ providers: ['google'] })).toBe(true);
    expect(openedByProvider({ provider: 'google' })).toBe(true);
  });

  it('is false for an e-mail account, linked or not', () => {
    for (const meta of [
      { provider: 'email', providers: ['email'] },
      { provider: 'email', providers: ['email', 'apple'] },
      { provider: 'email' },
    ]) {
      expect(openedByProvider(meta)).toBe(false);
    }
  });

  it('is false for anything it cannot read', () => {
    for (const meta of [undefined, null, {}, { providers: 'google' }]) {
      expect(openedByProvider(meta)).toBe(false);
    }
  });
});
