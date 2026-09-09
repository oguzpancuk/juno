import { afterAll, beforeAll, expect, it } from 'vitest';
import { z } from 'zod';
import { ISTANBUL_NEARBY, STARTER, profileRow } from './fixtures';
import {
  adminClient,
  createUser,
  deleteUsers,
  localStack,
  type TestUser,
} from './local';

/**
 * The account-deletion done-when clause: one call removes the auth user
 * and, through the cascades, every row that referenced them — on both
 * sides of a match. The function runs on the local edge runtime that
 * `supabase start` brings up.
 */

const admin = adminClient();
const users: TestUser[] = [];
/** Accounts the tests delete on purpose; cleanup must skip them. */
const deleted = new Set<string>();

let mert: TestUser; // deletes their account
let nur: TestUser; // stays behind, matched with Mert
let matchId: string;

async function user(tag: string): Promise<TestUser> {
  const u = await createUser(admin, tag);
  users.push(u);
  return u;
}

async function accessToken(u: TestUser): Promise<string> {
  const { data } = await u.client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('no session for the test user');
  return token;
}

const endpoint = (): string =>
  `${localStack().API_URL}/functions/v1/delete-account`;

beforeAll(async () => {
  mert = await user('mert');
  nur = await user('nur');
  for (const [u, name, gender, interest] of [
    [mert, 'Mert', 'man', 'women'],
    [nur, 'Nur', 'woman', 'men'],
  ] as const) {
    const { error } = await u.client.from('profiles').insert(
      profileRow({
        id: u.id,
        display_name: name,
        gender,
        interested_in: interest,
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    if (error) throw new Error(`insert ${name}: ${error.message}`);
  }
  await mert.client.from('likes').insert({
    from_id: mert.id,
    to_id: nur.id,
    kind: 'like',
    starter_key: STARTER,
  });
  await nur.client.from('likes').insert({
    from_id: nur.id,
    to_id: mert.id,
    kind: 'like',
    starter_key: STARTER,
  });
  const match = z
    .object({ match_id: z.string().uuid() })
    .parse(
      (await mert.client.from('match_profiles').select('match_id').single())
        .data,
    );
  matchId = match.match_id;
  await mert.client
    .from('messages')
    .insert({ match_id: matchId, sender_id: mert.id, body: 'Merhaba Nur' });
  await nur.client
    .from('messages')
    .insert({ match_id: matchId, sender_id: nur.id, body: 'Merhaba Mert' });
  await mert.client
    .from('blocks')
    .insert({ blocker_id: mert.id, blocked_id: nur.id });
  await mert.client
    .from('reports')
    .insert({ reporter_id: mert.id, reported_id: nur.id, reason: 'spam' });
  // Blocking hides the match; the delete must still clear those rows.
  await mert.client
    .from('blocks')
    .delete()
    .eq('blocker_id', mert.id)
    .eq('blocked_id', nur.id);
}, 30_000);

afterAll(async () => {
  // The accounts the tests deleted are already gone; deleteUsers reports
  // any failure on the rest.
  await deleteUsers(
    admin,
    users.filter((u) => !deleted.has(u.id)),
  );
});

it('refuses a call without a token', async () => {
  // The apikey gets past the gateway; the missing Authorization is what
  // the function itself answers, and its answer carries the headers.
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: { apikey: localStack().ANON_KEY },
  });
  expect(response.status).toBe(401);
});

it('refuses an anon or service-role key used as a bearer token', async () => {
  const stack = localStack();
  for (const key of [stack.ANON_KEY, stack.SERVICE_ROLE_KEY]) {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: stack.ANON_KEY },
    });
    expect(response.status).toBe(401);
  }
});

it('ignores a body naming someone else and deletes only the caller', async () => {
  const victim = await user('victim');
  const { error } = await victim.client.from('profiles').insert(
    profileRow({
      id: victim.id,
      display_name: 'Victim',
      gender: 'woman',
      interested_in: 'everyone',
      lonLat: ISTANBUL_NEARBY,
    }),
  );
  expect(error).toBeNull();

  const attacker = await user('attacker');
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken(attacker)}`,
      apikey: localStack().ANON_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ user_id: victim.id, id: victim.id }),
  });
  expect(response.status).toBe(200);
  expect(
    z.object({ deleted: z.string() }).parse(await response.json()),
  ).toEqual({ deleted: attacker.id });
  deleted.add(attacker.id);
  const stillThere = await admin
    .from('profiles')
    .select('id')
    .eq('id', victim.id);
  expect(stillThere.data ?? []).toHaveLength(1);
});

it('sends the CORS headers the browser client needs', async () => {
  // Asserted on a POST, not on OPTIONS: the local gateway answers the
  // preflight itself, so an OPTIONS test would pass with no CORS code in
  // the function at all.
  // The apikey gets past the gateway; the missing Authorization is what
  // the function itself answers, and its answer carries the headers.
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: { apikey: localStack().ANON_KEY },
  });
  expect(response.status).toBe(401);
  expect(response.headers.get('access-control-allow-origin')).toBe('*');
  const allowed = response.headers.get('access-control-allow-headers') ?? '';
  // supabase-js sends x-client-info by default, so the preflight lists it.
  for (const header of ['authorization', 'apikey', 'x-client-info']) {
    expect(allowed).toContain(header);
  }
});

it('refuses a GET', async () => {
  const response = await fetch(endpoint(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${await accessToken(mert)}` },
  });
  expect(response.status).toBe(405);
});

it('deletes the caller and every row that referenced them', async () => {
  const before = await admin
    .from('messages')
    .select('id')
    .eq('match_id', matchId);
  expect(before.data ?? []).toHaveLength(2);

  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken(mert)}`,
      apikey: localStack().ANON_KEY,
    },
  });
  expect(response.status).toBe(200);
  expect(
    z.object({ deleted: z.string() }).parse(await response.json()),
  ).toEqual({ deleted: mert.id });
  deleted.add(mert.id);

  // The auth user is gone.
  const authUser = await admin.auth.admin.getUserById(mert.id);
  expect(authUser.error).not.toBeNull();

  // Everything that pointed at them went with the cascade. Spelled out
  // rather than looped: the generated row types differ per table.
  const profile = await admin.from('profiles').select('id').eq('id', mert.id);
  expect(profile.data ?? []).toEqual([]);
  const likes = await admin
    .from('likes')
    .select('from_id')
    .eq('from_id', mert.id);
  expect(likes.data ?? []).toEqual([]);
  const reports = await admin
    .from('reports')
    .select('reporter_id')
    .eq('reporter_id', mert.id);
  expect(reports.data ?? []).toEqual([]);
  const blocks = await admin
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', mert.id);
  expect(blocks.data ?? []).toEqual([]);
  const matches = await admin.from('matches').select('id').eq('id', matchId);
  expect(matches.data ?? []).toEqual([]);
  const messages = await admin
    .from('messages')
    .select('id')
    .eq('match_id', matchId);
  expect(messages.data ?? []).toEqual([]);

  // The other person keeps their own account and simply loses the match.
  const survivor = await admin.from('profiles').select('id').eq('id', nur.id);
  expect(survivor.data ?? []).toHaveLength(1);
  const forNur = await nur.client.from('match_profiles').select('match_id');
  expect(forNur.data ?? []).toEqual([]);
}, 30_000);
