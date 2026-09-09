/**
 * Deletes the caller's account: the auth user, and through the schema's
 * cascades the profile, likes, matches, messages and blocks. Reports stay:
 * the caller's id is nulled and the note cleared, so what is left is the
 * reason, the time and the other side's id.
 *
 * The service-role key never leaves this function; the app calls it with
 * the user's own access token and can only ever delete itself. Deno, not
 * Node: Edge Functions run on the edge runtime, so this file is outside
 * the workspace's TypeScript project (see supabase/eslint.config.js).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

// The web client (ADR-0005) calls this cross-origin, and supabase-js
// sends authorization plus apikey, which always triggers a preflight.
const CORS = {
  'access-control-allow-origin': '*',
  // x-client-info is in supabase-js's default headers, so a browser
  // preflight lists it; leaving it out fails the request in the browser.
  'access-control-allow-headers':
    'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'unauthorized' });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return json(500, { error: 'misconfigured' });
  }

  // Who is calling: their own token, their own RLS, no elevation.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return json(401, { error: 'unauthorized' });
  const userId = data.user.id;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Photos live under "<uid>/" in a private bucket. Storage objects are
  // not rows, so nothing cascades: they have to go first, while the user
  // still exists to be listed.
  // Paged: list() answers 100 at a time, and a folder with more than that
  // would leave photos of a deleted person fetchable by anyone holding the
  // path. Uploads are one level deep by policy, so a flat listing is
  // complete.
  const PAGE = 100;
  for (let offset = 0; ; offset += PAGE) {
    const listed = await admin.storage
      .from('photos')
      .list(userId, { limit: PAGE, offset });
    if (listed.error) {
      console.error('delete-account list failed', listed.error.message);
      return json(500, { error: 'delete_failed' });
    }
    if (listed.data.length === 0) break;
    const removed = await admin.storage
      .from('photos')
      .remove(listed.data.map((file) => `${userId}/${file.name}`));
    if (removed.error) {
      console.error('delete-account photos failed', removed.error.message);
      return json(500, { error: 'delete_failed' });
    }
    // Removing shrinks the folder, so the next page starts at 0 again.
    offset = -PAGE;
  }
  const deleted = await admin.auth.admin.deleteUser(userId);
  if (deleted.error) {
    console.error('delete-account failed', deleted.error.message);
    return json(500, { error: 'delete_failed' });
  }
  return json(200, { deleted: userId });
});
