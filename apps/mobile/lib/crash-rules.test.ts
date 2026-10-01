import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';
import { describe, expect, it } from 'vitest';
import {
  crashTestSchema,
  keepBreadcrumb,
  scrub,
  scrubEvent,
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

  it('keeps only navigation breadcrumbs, with the ids out', () => {
    // Touch and click breadcrumbs carry labels ("Selin'i beğen"), console
    // ones carry whatever was logged, and request ones carry query
    // strings with ids in them.
    for (const category of ['touch', 'ui.click', 'console', 'fetch', 'xhr'])
      expect(keepBreadcrumb({ category, message: 'x' })).toBeNull();
    const kept = keepBreadcrumb({
      category: 'navigation',
      data: { from: `/chat/${ID}`, to: '/matches' },
    } satisfies Breadcrumb);
    expect(kept?.data).toEqual({ from: '/chat/<id>', to: '/matches' });
  });

  it('sends an event with no user and no ids in it', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: `failed for ${ID}`,
      user: { id: ID, email: 'deniz@seed.local', ip_address: '{{auto}}' },
      request: {
        url: `https://www.juno-dating.com/chat/${ID}`,
        headers: { Referer: `https://www.juno-dating.com/match/${ID}` },
      },
      exception: {
        values: [{ type: 'Error', value: `duplicate key (${ID})` }],
      },
      breadcrumbs: [
        { category: 'console', message: 'deniz@seed.local' },
        { category: 'navigation', data: { from: '/', to: `/chat/${ID}` } },
      ],
    };
    const sent = scrubEvent(event);
    expect(sent.user).toBeUndefined();
    expect(sent.message).toBe('failed for <id>');
    expect(sent.request?.url).toBe('https://www.juno-dating.com/chat/<id>');
    expect(sent.request?.headers).toEqual({
      Referer: 'https://www.juno-dating.com/match/<id>',
    });
    expect(sent.exception?.values?.[0]?.value).toBe('duplicate key (<id>)');
    expect(sent.breadcrumbs).toEqual([
      { category: 'navigation', data: { from: '/', to: '/chat/<id>' } },
    ]);
  });
});
