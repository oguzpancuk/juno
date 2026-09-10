/**
 * Serves one profile photo, authorising every single request.
 *
 * Why not a signed URL: Storage validates a signature, not the block
 * table, so a URL handed out before a block keeps resolving while a
 * deleted account's stops at once. That difference is an oracle, and this
 * codebase treats "blocked" and "deleted" being indistinguishable as a
 * hard property, so the check has to happen on the request rather than on
 * the hand-out (ADR-0006).
 *
 * Blocked, deleted, never existed and malformed all answer 404 with the
 * same body. The service-role key never leaves this function; the caller
 * is identified by their own access token.
 *
 * Deno, not Node: Edge Functions run on the edge runtime, so this file is
 * outside the workspace's TypeScript project (see supabase/eslint.config.js).
 */
// Pinned, not `@2`: a floating major resolves over the network at cold
// start, so a new release could break a deploy or a CI run with no commit
// here. Keep in step with the version supabase/package.json resolves.
import { createClient } from 'jsr:@supabase/supabase-js@2.116.0';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'GET, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

/** One folder level, named by the owner's uuid. Mirrors the bucket policy. */
const PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/]+$/;

/** Every refusal looks the same from outside. */
const notFound = (): Response => json(404, { error: 'not_found' });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'unauthorized' });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return json(500, { error: 'misconfigured' });
  }

  const path = new URL(req.url).searchParams.get('path');
  if (!path || !PATH.test(path)) return notFound();
  const owner = path.slice(0, path.indexOf('/'));

  // Who is calling: their own token, their own RLS, no elevation.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return json(401, { error: 'unauthorized' });
  const viewer = data.user.id;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (viewer !== owner) {
    // Either direction: being blocked and having blocked both hide the
    // photo, exactly as the read policy on the bucket does.
    const blocked = await admin
      .from('blocks')
      .select('blocker_id')
      .or(
        `and(blocker_id.eq.${owner},blocked_id.eq.${viewer}),` +
          `and(blocker_id.eq.${viewer},blocked_id.eq.${owner})`,
      )
      .limit(1);
    if (blocked.error) {
      console.error('photo block check failed', blocked.error.message);
      return json(500, { error: 'failed' });
    }
    if (blocked.data.length > 0) return notFound();
  }

  const file = await admin.storage.from('photos').download(path);
  // A deleted account's objects are gone, so this is the same 404 a
  // blocked viewer gets.
  if (file.error || !file.data) return notFound();

  return new Response(file.data, {
    status: 200,
    headers: {
      ...CORS,
      'content-type': file.data.type || 'application/octet-stream',
      // Authorisation is per request, so nothing may be reused later:
      // a cached copy would put the window this function exists to close
      // straight back.
      'cache-control': 'private, no-store',
    },
  });
});
