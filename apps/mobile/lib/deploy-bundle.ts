/**
 * What a built web bundle has to contain before it may be published.
 *
 * `check-deploy-env.ts` verifies the *inputs* — which address and key the
 * export will resolve. This verifies the *output*, and it exists because
 * those two came apart in production on 2026-09-18: `npm run deploy` ran
 * `expo export` without `--clear`, Metro reused a cached transform of
 * `lib/env.ts` from an earlier build made against the local stack, and
 * juno-dating.com went live pointing at `http://127.0.0.1:54321` with the
 * demo anon key. The deployed bundle was byte-identical to the local one.
 * The input gate passed, correctly and uselessly: it had checked the
 * values Expo would resolve, and Metro never asked for them.
 *
 * `--clear` is on the export now, which fixes the cause. This is the part
 * that would have caught it anyway, and that catches whatever the next
 * cause turns out to be — because it asks the only question that actually
 * matters: is what we are about to publish pointing where we think?
 *
 * Node only, at deploy time; nothing in `app/` may import it.
 */

import { checkDeployKey, projectRef, type Check } from './deploy-target';

/** Every hosted Supabase project answers on this suffix. */
const HOSTED = /https:\/\/[a-z0-9-]+\.supabase\.co/gu;

/**
 * A JWT as it appears in a bundle. Only the shape is matched; the claims
 * are read by `checkDeployKey`, which is the one place that knows what a
 * key is allowed to say.
 */
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/gu;

export function checkDeployBundle({
  bundle,
  url,
  anonKey,
}: {
  /** Every published JavaScript file and the page, concatenated. */
  readonly bundle: string;
  /** The address the input gate resolved and approved. */
  readonly url: string;
  /** The key the input gate resolved and approved. */
  readonly anonKey: string;
}): Check {
  // The question the whole file exists to ask. A bundle built against
  // anything else — a stale cache, a shell left over from init.sh, a
  // half-finished export — cannot contain these two strings.
  if (!bundle.includes(url)) {
    return {
      ok: false,
      reason: `paket bu adresi içermiyor: ${url} — derleme başka bir değerle yapılmış`,
    };
  }
  if (!bundle.includes(anonKey)) {
    return {
      ok: false,
      reason:
        'paket onaylanan anon anahtarını içermiyor — derleme başka bir değerle yapılmış',
    };
  }

  // And nothing else's. A second project's address in the bundle is either
  // a leftover or a mistake, and either way a visitor could be sent there.
  const others = [...new Set(bundle.match(HOSTED) ?? [])].filter(
    (found) => found !== url,
  );
  if (others.length > 0) {
    return {
      ok: false,
      reason: `pakette başka bir proje adresi var: ${others.join(', ')}`,
    };
  }

  // Defence in depth for the rule CLAUDE.md states outright: no
  // service-role key ever ships in the app. The input gate checks the key
  // it resolved; this checks every key that actually made it in.
  const ref = projectRef(url);
  for (const token of new Set(bundle.match(JWT) ?? [])) {
    const verdict = checkDeployKey(token, ref);
    if (!verdict.ok) {
      return {
        ok: false,
        reason: `pakette kabul edilmeyen bir anahtar var: ${verdict.reason}`,
      };
    }
  }

  return { ok: true, detail: `${url} (anahtar: anon)` };
}
