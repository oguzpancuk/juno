/**
 * What the web build is allowed to point at.
 *
 * `EXPO_PUBLIC_SUPABASE_URL` is inlined into the bundle at export time, so
 * whatever the shell holds when `expo export` runs is what every visitor
 * gets. `contracts/init.sh` exports the local stack's URL into the shell
 * it starts; running a deploy from that shell would publish a site that
 * talks to `127.0.0.1` — working perfectly on the machine that built it
 * and broken for everyone else, with the battery still green because
 * nothing in it looks at a deployed bundle.
 *
 * `lib/env.ts` cannot refuse a local URL: local is what it is for during
 * development. So the refusal lives here, and only the deploy path asks.
 */

export type DeployTarget =
  | { readonly ok: true; readonly host: string }
  | { readonly ok: false; readonly reason: string };

/** Hosts that mean "this machine" or "this network", in the forms they appear. */
function isPrivateHost(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;
  // IPv6 loopback arrives bracketed from the URL parser.
  if (host === '[::1]' || host === '::1') return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(host);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return (
    a === 127 || // loopback
    a === 0 || // "this host"
    a === 10 || // private
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 169 && b === 254) // link-local
  );
}

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
  if (isPrivateHost(url.hostname)) {
    return { ok: false, reason: `yerel adres: ${value}` };
  }
  return { ok: true, host: url.hostname };
}
