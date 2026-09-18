import { describe, expect, it } from 'vitest';
import { checkDeployBundle } from './deploy-bundle';

/**
 * The hosted project's shape. A real anon key is a JWT whose payload names
 * the project; these are built rather than pasted so the test carries no
 * live credential and still exercises the decoding.
 */
const jwt = (claims: Record<string, unknown>): string =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
      'base64url',
    ),
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'c2lnbmF0dXJl',
  ].join('.');

const URL_ = 'https://jkxuhbuuhsumyjmlskls.supabase.co';
const ANON = jwt({
  iss: 'supabase',
  role: 'anon',
  ref: 'jkxuhbuuhsumyjmlskls',
});

/** A bundle as Metro writes it: the values inlined into the env parse. */
const built = (url: string, key: string): string =>
  `}).parse({supabaseUrl:"${url}",supabaseAnonKey:"${key}",googleWebClientId:void 0});`;

/**
 * The gate that would have caught the deploy of 2026-09-18.
 *
 * `npm run deploy` exported without `--clear`; Metro reused a transform of
 * `lib/env.ts` cached from a build made against the local stack, and
 * juno-dating.com went live pointing at `http://127.0.0.1:54321` with the
 * demo key. The input gate passed — it had checked the values Expo would
 * resolve, and Metro never asked for them. Nothing looked at the file that
 * was actually published.
 *
 * Both of the real bundles from that day were run through this before the
 * cases below were written: the published one is refused on the first
 * rule, the corrected one accepted.
 */
describe('checkDeployBundle', () => {
  it('accepts a bundle carrying the approved address and key', () => {
    const verdict = checkDeployBundle({
      bundle: built(URL_, ANON),
      url: URL_,
      anonKey: ANON,
    });
    expect(verdict.ok).toBe(true);
  });

  it('refuses the bundle that actually shipped: built against the local stack', () => {
    const local = jwt({ iss: 'supabase-demo', role: 'anon' });
    const verdict = checkDeployBundle({
      bundle: built('http://127.0.0.1:54321', local),
      url: URL_,
      anonKey: ANON,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toContain(URL_);
  });

  it('refuses a bundle with the right address and a stale key', () => {
    const verdict = checkDeployBundle({
      bundle: built(URL_, jwt({ iss: 'supabase-demo', role: 'anon' })),
      url: URL_,
      anonKey: ANON,
    });
    expect(verdict.ok).toBe(false);
  });

  it('refuses a second project’s address, however it got in', () => {
    const verdict = checkDeployBundle({
      bundle: `${built(URL_, ANON)} fetch("https://someoneelse.supabase.co/x")`,
      url: URL_,
      anonKey: ANON,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toContain('someoneelse');
  });

  /**
   * CLAUDE.md states it outright: no service-role key ever ships in the
   * app. The input gate checks the key it resolved; this checks every key
   * that reached the file, whatever put it there.
   */
  it('refuses a service-role key anywhere in the bundle', () => {
    const service = jwt({
      iss: 'supabase',
      role: 'service_role',
      ref: 'jkxuhbuuhsumyjmlskls',
    });
    const verdict = checkDeployBundle({
      bundle: `${built(URL_, ANON)} const admin="${service}";`,
      url: URL_,
      anonKey: ANON,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toContain('anahtar');
  });
});
