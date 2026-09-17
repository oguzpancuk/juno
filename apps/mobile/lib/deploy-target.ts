/**
 * What the web build is allowed to point at.
 *
 * `EXPO_PUBLIC_SUPABASE_URL` and `_ANON_KEY` are inlined into the bundle at
 * export time, so whatever the shell holds when `expo export` runs is what
 * every visitor gets. `contracts/init.sh` exports the local stack's values
 * into the shell it starts; a deploy from that shell publishes a site that
 * talks to `127.0.0.1` with a demo key — perfect on the machine that built
 * it, broken for everyone else, and the battery stays green because
 * nothing in it looks at a deployed bundle.
 *
 * `lib/env.ts` cannot refuse those values: local is what it is for during
 * development. So the refusal lives here, and only the deploy path asks.
 *
 * An allow-list, not a deny-list. The first version enumerated private
 * address ranges and a review walked straight through it — `fe80::`,
 * `fc00::`, `::ffff:127.0.0.1`, `100.64.0.0/10`, a dotless `oguz-macbook`,
 * `supabase.internal`, `127.0.0.1.nip.io`. There is exactly one shape of
 * legitimate target, so naming it is both shorter and tighter than trying
 * to name everything it is not.
 */

export type DeployTarget =
  | { readonly ok: true; readonly host: string }
  | { readonly ok: false; readonly reason: string };

/** Every hosted Supabase project answers on this suffix. */
const HOSTED_SUFFIX = '.supabase.co';

export function checkDeployTarget(value: string | undefined): DeployTarget {
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
  const host = url.hostname;
  if (!host.endsWith(HOSTED_SUFFIX) || host.length <= HOSTED_SUFFIX.length) {
    return { ok: false, reason: `hosted Supabase adresi değil: ${value}` };
  }
  return { ok: true, host };
}

/**
 * The anon key, checked for the one mistake that matters: the local
 * stack's demo key, which every Supabase installation shares and which
 * `contracts/init.sh` exports beside the local URL. It is public and
 * worthless, and a site shipped with it answers 401 to every request.
 *
 * Only the issuer is read. The key is a JWT whose payload is public by
 * design — it travels in every request the app makes — so reading it here
 * discloses nothing that the bundle does not already publish.
 */
export function checkDeployKey(value: string | undefined): DeployTarget {
  if (!value) {
    return { ok: false, reason: 'EXPO_PUBLIC_SUPABASE_ANON_KEY boş' };
  }
  const parts = value.split('.');
  if (parts.length !== 3) {
    // Newer projects issue `sb_publishable_…` keys, which are not JWTs and
    // carry no issuer to read. Nothing to object to.
    return { ok: true, host: 'jwt değil' };
  }
  let issuer = '';
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(parts[1] ?? '', 'base64url').toString('utf8'),
    );
    if (payload && typeof payload === 'object' && 'iss' in payload) {
      issuer = String((payload as { iss: unknown }).iss);
    }
  } catch {
    return { ok: false, reason: 'anon anahtarı okunamadı' };
  }
  if (issuer === 'supabase-demo') {
    return { ok: false, reason: 'yerel yığının demo anon anahtarı' };
  }
  return { ok: true, host: issuer || 'bilinmeyen' };
}

/**
 * The `.env` file the way Expo reads it, for the one caller that has to
 * look before Expo does.
 *
 * The gate runs before `expo export`, and it is `expo export` that loads
 * `apps/mobile/.env` — so a gate that only read the shell saw nothing and
 * refused every honest deploy, which is how this function came to exist.
 * Deliberately small: no interpolation, no `export ` prefixes, no
 * multi-line values. It reads the file this repo actually writes, and
 * anything fancier belongs to Expo, which is the thing that matters at
 * export time.
 */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

/**
 * Which value the export will actually use. A variable already in the
 * shell wins over the file — that is Expo's order (`@expo/env` skips a key
 * that is already defined), and it is the order that makes an
 * `init.sh` shell dangerous, so the gate must judge the value Expo will
 * inline rather than the one written down.
 */
export function effectiveValue(
  shell: string | undefined,
  file: Record<string, string>,
  key: string,
): string | undefined {
  return shell !== undefined && shell !== '' ? shell : file[key];
}
