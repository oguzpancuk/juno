/**
 * RevenueCat's webhook: renewals, cancellations, refunds, expiries and
 * transfers of the premium subscription (payments plan, PR 1 of 4;
 * docs/adr/0015-payments.md). RevenueCat has already verified each
 * purchase with Apple; what this function has to establish is that the
 * call is RevenueCat's, and then it hands the event to
 * `public.apply_revenuecat_event`, where the rules are.
 *
 * Who is calling: RevenueCat sends the Authorization header configured in
 * its dashboard, and nothing else identifies it, so that header is
 * compared with `REVENUECAT_WEBHOOK_AUTH` from this function's env. No
 * secret, no service: a function deployed without it refuses every call
 * rather than accepting every call. There is no Supabase JWT on these
 * requests, so the gateway's JWT check is off for this function
 * (`[functions.revenuecat-webhook]` in supabase/config.toml).
 *
 * What RevenueCat retries: any answer that is not 2xx. So an event this
 * app has no use for (a test, another entitlement, an anonymous user) is
 * a 200 with the reason, and only a failure on our side — the database
 * not answering — is a 500 worth another delivery.
 *
 * Deno, not Node: outside the workspace's TypeScript project, like the
 * other functions (see supabase/eslint.config.js).
 */
// Pinned, not floating: a floating major resolves over the network at
// cold start (tests/functions-pinned.test.ts). Keep supabase-js in step
// with supabase/package.json, and zod with the workspace's.
import { createClient } from 'jsr:@supabase/supabase-js@2.116.0';
import { z } from 'npm:zod@3.25.76';

// A server-to-server endpoint: no browser calls it, so no CORS headers
// are offered. OPTIONS is still answered, by this module and not by the
// gateway, because the suite warms every function with a preflight
// (tests/global-setup.ts).
const ALLOW = { 'access-control-allow-methods': 'POST, OPTIONS' };

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...ALLOW, 'content-type': 'application/json' },
  });

const Millis = z.number().int().nonnegative();
const Ids = z.array(z.string()).nullish();

/**
 * The fields the rules read, named as RevenueCat names them. Everything
 * else in the payload (price, country, currency…) is dropped here, so it
 * is never passed on, logged or stored. Presence is the database's
 * question, per event type; this checks that what is there has the right
 * shape.
 */
const WebhookSchema = z.object({
  event: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    event_timestamp_ms: Millis,
    // RevenueCat's `app_user_id` is the id it saw last; a purchase made
    // before the app logged in carries the Supabase id only among these.
    app_user_id: z.string().nullish(),
    original_app_user_id: z.string().nullish(),
    aliases: Ids,
    entitlement_ids: Ids,
    product_id: z.string().nullish(),
    store: z.string().nullish(),
    environment: z.enum(['SANDBOX', 'PRODUCTION']).nullish(),
    original_transaction_id: z.string().nullish(),
    expiration_at_ms: Millis.nullish(),
    grace_period_expiration_at_ms: Millis.nullish(),
    cancel_reason: z.string().nullish(),
    transferred_from: Ids,
    transferred_to: Ids,
  }),
});

const encoder = new TextEncoder();

/**
 * Compares two strings without saying how much of them matched. Both are
 * hashed first so the comparison always walks 32 bytes, whatever the
 * lengths, and the loop does not stop at the first difference.
 */
async function sameSecret(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(given)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return difference === 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: ALLOW });
  }
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!expected || !url || !serviceKey) {
    console.error('revenuecat-webhook: missing env');
    return json(500, { error: 'misconfigured' });
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization || !(await sameSecret(authorization, expected))) {
    return json(401, { error: 'unauthorized' });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const parsed = WebhookSchema.safeParse(raw);
  if (!parsed.success) {
    // A shape RevenueCat would send again unchanged: say so, and say
    // where, but do not echo the payload into the logs.
    console.error(
      'revenuecat-webhook: invalid event',
      parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
    return json(400, { error: 'invalid_event' });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc('apply_revenuecat_event', {
    event: parsed.data.event,
  });
  if (error) {
    console.error('revenuecat-webhook: apply failed', error.message);
    return json(500, { error: 'apply_failed' });
  }
  const outcome = z.string().safeParse(data);
  if (!outcome.success) {
    console.error('revenuecat-webhook: unexpected answer from the database');
    return json(500, { error: 'apply_failed' });
  }
  return json(200, { outcome: outcome.data });
});
