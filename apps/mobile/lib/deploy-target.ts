/**
 * What the web build is allowed to point at, and with which key.
 *
 * `EXPO_PUBLIC_SUPABASE_URL` and `_ANON_KEY` are inlined into the bundle at
 * export time, so whatever is resolved when `expo export` runs is what
 * every visitor gets, readable by anyone who views source. Two mistakes
 * are one keystroke away and neither shows up in the battery, because
 * nothing in it looks at a deployed bundle:
 *
 * - `contracts/init.sh` exports the local stack's URL and demo key into
 *   the shell it starts, so a deploy from that shell publishes a site that
 *   talks to `127.0.0.1`;
 * - the service-role key sits directly beside the anon key in the Supabase
 *   dashboard and differs only in one field, so the wrong row publishes a
 *   key that bypasses every RLS policy this product relies on. CLAUDE.md:
 *   "no service-role key ever ships in the app" — this is the only place
 *   that can enforce it.
 *
 * `lib/env.ts` cannot refuse any of it: local is what it is for during
 * development. So the refusal lives here, and only the deploy path asks.
 *
 * Allow-lists, not deny-lists. The first version enumerated private
 * address ranges and a review walked straight through it — `fe80::`,
 * `fc00::`, `::ffff:127.0.0.1`, `100.64.0.0/10`, a dotless
 * `oguz-macbook`, `supabase.internal`, `127.0.0.1.nip.io`. There is one
 * shape of legitimate target and one of legitimate key, so naming those is
 * both shorter and tighter than naming everything they are not.
 *
 * This module runs under Node, at deploy time — it reads files and decodes
 * base64 — and nothing in `app/` may import it. It lives beside the app's
 * code so the battery can hold its rules, not because it ships.
 */

import { parseEnv } from 'node:util';

export type Check =
  | { readonly ok: true; readonly detail: string }
  | { readonly ok: false; readonly reason: string };

/** Every hosted Supabase project answers on this suffix. */
const HOSTED_SUFFIX = '.supabase.co';

export function checkDeployTarget(value: string | undefined): Check {
  if (!value) {
    return { ok: false, reason: 'EXPO_PUBLIC_SUPABASE_URL boş' };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: `adres okunamadı: ${value}` };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: `https değil: ${value}` };
  }
  // A path or credentials in the URL are not a hosted project's address;
  // supabase-js would build `/rest/v1` beneath the path and 404 everywhere.
  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: `adreste kullanıcı bilgisi var: ${value}` };
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    return { ok: false, reason: `adreste yol var: ${value}` };
  }
  const host = url.hostname;
  if (!host.endsWith(HOSTED_SUFFIX) || host.length <= HOSTED_SUFFIX.length) {
    return { ok: false, reason: `hosted Supabase adresi değil: ${value}` };
  }
  return { ok: true, detail: host };
}

/** The project ref: the label in front of `.supabase.co`, or null. */
export function projectRef(value: string | undefined): string | null {
  const target = checkDeployTarget(value);
  if (!target.ok) return null;
  return target.detail.slice(0, -HOSTED_SUFFIX.length);
}

interface KeyClaims {
  readonly iss?: unknown;
  readonly role?: unknown;
  readonly ref?: unknown;
}

/**
 * The key that ships. Three things are checked, each of them a mistake
 * someone has a plausible path to making: the local stack's demo key
 * (shared by every Supabase installation, and a site carrying it answers
 * 401 to everyone), a key for a different project (same symptom, harder to
 * see), and any key whose role is not `anon` — which is how a service-role
 * key would reach the public.
 *
 * Only public claims are read. An anon key travels in every request the
 * app makes; its payload is not a secret, and nothing is printed.
 */
export function checkDeployKey(
  value: string | undefined,
  expectedRef: string | null,
): Check {
  if (!value) {
    return { ok: false, reason: 'EXPO_PUBLIC_SUPABASE_ANON_KEY boş' };
  }
  // Newer projects issue these instead of JWTs. The two prefixes say which
  // side of the fence a key is on, and the secret one must never ship.
  if (value.startsWith('sb_secret_')) {
    return { ok: false, reason: 'bu gizli (secret) anahtar, anon değil' };
  }
  if (value.startsWith('sb_publishable_')) {
    return { ok: true, detail: 'publishable' };
  }
  const parts = value.split('.');
  if (parts.length !== 3) {
    return { ok: false, reason: 'anon anahtarı tanınmadı' };
  }
  let claims: KeyClaims;
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(parts[1] ?? '', 'base64url').toString('utf8'),
    );
    if (!decoded || typeof decoded !== 'object')
      throw new Error('not an object');
    claims = decoded as KeyClaims;
  } catch {
    return { ok: false, reason: 'anon anahtarı okunamadı' };
  }
  if (claims.iss === 'supabase-demo') {
    return { ok: false, reason: 'yerel yığının demo anon anahtarı' };
  }
  if (claims.role !== 'anon') {
    return {
      ok: false,
      reason: `anahtarın rolü "${String(claims.role)}", "anon" olmalı`,
    };
  }
  if (
    expectedRef !== null &&
    typeof claims.ref === 'string' &&
    claims.ref !== expectedRef
  ) {
    return {
      ok: false,
      reason: `anahtar başka bir projenin: ${claims.ref} ≠ ${expectedRef}`,
    };
  }
  return { ok: true, detail: 'anon' };
}

/**
 * An `.env` file exactly the way Expo reads one — by calling the same
 * function. `@expo/env` parses with `node:util`'s `parseEnv`
 * (`node_modules/@expo/env/build/parse.js`), so this does too.
 *
 * It used to be a hand-rolled parser, and a review walked past it: Node
 * strips a leading `export ` and the hand-rolled version did not, so
 * `export EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` in `.env.local`
 * was invisible to the gate and inlined by the export — the exact bypass
 * the gate exists to stop, in a spelling that is a natural habit, because
 * it is what makes a file `source`-able and `contracts/init.sh` sources
 * values that way. Every other divergence found (trailing comments, quote
 * styles, multi-line values) failed closed; this one failed open. Sharing
 * the implementation is the only way the two cannot drift again.
 */
export function parseEnvFile(contents: string): Record<string, string> {
  return parseEnv(contents) as Record<string, string>;
}

/**
 * Several files, in Expo's order: `.env.production.local`, `.env.local`,
 * `.env.production`, `.env`, and the first one to define a key wins.
 * Reading only `.env` was a hole — `.env.local` is the conventional
 * override and `.gitignore` expects it, so a local URL written there would
 * have sailed past a gate that looked at `.env` alone.
 *
 * `null` stands for a file that is not there.
 */
export function mergeEnvFiles(
  contents: readonly (string | null)[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of contents) {
    if (file === null) continue;
    for (const [key, value] of Object.entries(parseEnvFile(file))) {
      if (!(key in out)) out[key] = value;
    }
  }
  return out;
}

/**
 * Which value the export will actually use. A key defined in the shell
 * wins over every file — that is `@expo/env`'s rule, which skips a key
 * that is already defined, **including one defined as empty**. An exported
 * but empty variable therefore beats a correct file, and this returns the
 * empty string so the checks above refuse it rather than reading past it.
 */
export function effectiveValue(
  shell: string | undefined,
  files: Record<string, string>,
  key: string,
): string | undefined {
  return shell !== undefined ? shell : files[key];
}
