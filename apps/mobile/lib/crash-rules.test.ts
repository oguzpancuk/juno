import type { ErrorEvent } from '@sentry/react-native';
import { describe, expect, it } from 'vitest';
import {
  crashReportingOptions,
  crashTestSchema,
  deployableDsnSchema,
  reportingDsnSchema,
  scrub,
  scrubEvent,
  scrubUrl,
  sentryDsnSchema,
} from './crash-rules';

const ID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

describe('crash reporting', () => {
  it('takes only a DSN in the EU region, or a stand-in on this machine', () => {
    // The notice says reports are kept in the EU; a DSN from the US
    // region would make that false without a word changing.
    const eu =
      'https://0123456789abcdef0123456789abcdef@o4508000000000000.ingest.de.sentry.io/4508000000000001';
    expect(sentryDsnSchema.parse(eu)).toBe(eu);
    expect(() =>
      sentryDsnSchema.parse(
        'https://0123456789abcdef0123456789abcdef@o4508000000000000.ingest.us.sentry.io/4508000000000001',
      ),
    ).toThrow();
    expect(() =>
      sentryDsnSchema.parse(
        'https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/1',
      ),
    ).toThrow();
    expect(
      sentryDsnSchema.parse(
        'http://0123456789abcdef0123456789abcdef@127.0.0.1:9999/1',
      ),
    ).toBe('http://0123456789abcdef0123456789abcdef@127.0.0.1:9999/1');
    // The auth token is the secret, not the DSN; one pasted here would
    // ship to every phone.
    expect(() =>
      sentryDsnSchema.parse(
        'sntrys_eyJpYXQiOjE3MjcwMDAwMDAuMCwidXJsIjoiaHR0cHM6Ly9zZW50cnkuaW8ifQ',
      ),
    ).toThrow();
  });

  it('crashes on purpose only when the build says so', () => {
    expect(crashTestSchema.parse('1')).toBe(true);
    expect(crashTestSchema.parse(undefined)).toBe(false);
    expect(crashTestSchema.parse('')).toBe(false);
    expect(crashTestSchema.parse('0')).toBe(false);
    expect(crashTestSchema.parse('true')).toBe(false);
  });

  it('takes ids and e-mail addresses out of text', () => {
    expect(
      scrub(`Key (from_id)=(${ID}) for deniz@seed.local at /chat/${ID}`),
    ).toBe('Key (from_id)=(<id>) for <email> at /chat/<id>');
    expect(scrub(ID.toUpperCase())).toBe('<id>');
  });

  it('takes tokens out of text, before their payload can be read', () => {
    // A JWT's payload is the account id and the e-mail address in base64,
    // so neither UUID nor e-mail pattern would see them.
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZjJiOGMxZSIsImVtYWlsIjoiZGVuaXpAc2VlZC5sb2NhbCJ9.c2lnbmF0dXJl';
    expect(scrub(`fetch failed: /photos/a.jpg?token=${jwt}&t=1`)).toBe(
      'fetch failed: /photos/a.jpg?token=<token>&t=1',
    );
    expect(scrub(`refresh_token=v1.abcDEF123&code=4f9e`)).toBe(
      'refresh_token=<token>&code=<token>',
    );
  });

  it("keeps a URL's origin and path only: a sign-in fragment carries the session", () => {
    // The web client's implicit flow comes back from Google and Apple with
    // the tokens in the fragment, and supabase-js clears it only after a
    // round trip; the first render can fail before that.
    expect(
      scrubUrl(
        'https://juno-dating.com/#access_token=eyJa.eyJb.c&expires_in=3600&refresh_token=v1.xyz&provider_token=ya29.abc',
      ),
    ).toBe('https://juno-dating.com/');
    expect(
      scrubUrl(`https://www.juno-dating.com/chat/${ID}?from=match#top`),
    ).toBe('https://www.juno-dating.com/chat/<id>');
    expect(scrubUrl(`/chat/${ID}#access_token=eyJa.eyJb.c`)).toBe('/chat/<id>');
  });

  it('sends an event with no user and no ids in it', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: `failed for ${ID}`,
      user: { id: ID, email: 'deniz@seed.local', ip_address: '{{auto}}' },
      request: {
        url: 'https://juno-dating.com/#access_token=eyJa.eyJb.c&refresh_token=v1.xyz',
        headers: {
          Referer: `https://www.juno-dating.com/match/${ID}?token=eyJa.eyJb.c`,
        },
      },
      exception: {
        values: [{ type: 'Error', value: `duplicate key (${ID})` }],
      },
    };
    const sent = scrubEvent(event);
    expect(sent.user).toBeUndefined();
    expect(sent.message).toBe('failed for <id>');
    expect(sent.request?.url).toBe('https://juno-dating.com/');
    expect(sent.request?.headers).toEqual({
      Referer: 'https://www.juno-dating.com/match/<id>',
    });
    expect(sent.exception?.values?.[0]?.value).toBe('duplicate key (<id>)');
    expect(JSON.stringify(sent)).not.toMatch(/token=|eyJ|deniz/u);
  });

  it("drops the native SDK's device hash from what the JS side sends", () => {
    // `contexts.app.device_app_hash` is a hash of Apple's vendor id; the
    // iOS SDK puts it on the scope, and the RN SDK merges that scope into
    // JS events too. The JS path can take it out; the native path cannot,
    // which is why the notice names it.
    const sent = scrubEvent({
      type: undefined,
      contexts: {
        app: { app_version: '0.0.1', device_app_hash: 'a1b2c3' },
        os: { name: 'iOS' },
      },
    });
    expect(sent.contexts).toEqual({
      app: { app_version: '0.0.1' },
      os: { name: 'iOS' },
    });
  });

  it('starts with no breadcrumbs, no PII and nothing attached, on both SDKs', () => {
    // The options object reaches the native SDK too (minus the
    // callback), and the native SDK's own crash reports never pass
    // through `scrubEvent`. Its automatic breadcrumbs include every
    // network request, with Supabase URLs that carry account and match
    // ids, so the only rule both SDKs obey is "keep none".
    const dsn = 'http://0123456789abcdef0123456789abcdef@127.0.0.1:9999/1';
    const options = crashReportingOptions(dsn, {
      dev: false,
      crashTest: false,
    });
    expect(options).toMatchObject({
      dsn,
      environment: 'production',
      sendDefaultPii: false,
      maxBreadcrumbs: 0,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableAutoSessionTracking: true,
      enableCaptureFailedRequests: false,
    });
    expect(options.tracesSampleRate).toBeUndefined();
    expect(options.replaysSessionSampleRate).toBeUndefined();
    expect(options.beforeSend).toBe(scrubEvent);
  });

  it('files a crash-test build apart from production', () => {
    // A crash-test build is a release build, so `__DEV__` is false; its
    // crashes must not count against production's crash-free sessions.
    const dsn = 'http://0123456789abcdef0123456789abcdef@127.0.0.1:9999/1';
    const environment = (dev: boolean, crashTest: boolean) =>
      crashReportingOptions(dsn, { dev, crashTest }).environment;
    expect(environment(false, true)).toBe('crash-test');
    expect(environment(true, true)).toBe('crash-test');
    expect(environment(true, false)).toBe('development');
    expect(environment(false, false)).toBe('production');
  });

  it('reads a wrong DSN as no reporting, not as a failed start', () => {
    const eu =
      'https://0123456789abcdef0123456789abcdef@o4508000000000000.ingest.de.sentry.io/4508000000000001';
    expect(reportingDsnSchema.parse(eu)).toBe(eu);
    expect(reportingDsnSchema.parse(undefined)).toBeUndefined();
    expect(reportingDsnSchema.parse('')).toBeUndefined();
    expect(reportingDsnSchema.parse(`${eu}/`)).toBeUndefined();
    expect(
      reportingDsnSchema.parse(eu.replace('ingest.de.', 'ingest.us.')),
    ).toBeUndefined();
  });

  it('lets only an EU DSN be deployed, not the stand-in', () => {
    expect(
      deployableDsnSchema.safeParse(
        'https://0123456789abcdef0123456789abcdef@o4508000000000000.ingest.de.sentry.io/4508000000000001',
      ).success,
    ).toBe(true);
    expect(
      deployableDsnSchema.safeParse(
        'http://0123456789abcdef0123456789abcdef@127.0.0.1:9999/1',
      ).success,
    ).toBe(false);
  });
});
