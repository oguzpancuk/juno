import { afterAll, beforeAll, expect, it } from 'vitest';
import { ISTANBUL_NEARBY, insertProfileRow, profileRow } from './fixtures';
import {
  adminClient,
  createUser,
  deleteUsers,
  localStack,
  type TestUser,
} from './local';

/**
 * The photo endpoint exists for one reason: a signed URL is a bearer
 * token, so one issued before a block keeps resolving while a deleted
 * account's stops at once, and that difference tells a blocked person
 * which of the two happened (ADR-0006). Here the check happens on the
 * request, so the two answers must be identical — same status, same body.
 */

const admin = adminClient();
const users: TestUser[] = [];
const deleted = new Set<string>();

let ayla: TestUser; // owns a photo
let berk: TestUser; // looks at it
let ceren: TestUser; // owns a photo, then deletes the account

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

const endpoint = (path: string): string =>
  `${localStack().API_URL}/functions/v1/photo?path=${encodeURIComponent(path)}`;

async function fetchPhoto(
  viewer: TestUser,
  path: string,
): Promise<{ status: number; body: string; type: string | null }> {
  const response = await fetch(endpoint(path), {
    headers: {
      Authorization: `Bearer ${await accessToken(viewer)}`,
      apikey: localStack().ANON_KEY,
    },
  });
  const type = response.headers.get('content-type');
  // A 200 answers with bytes; every refusal answers with JSON.
  const body = response.ok ? '' : await response.text();
  return { status: response.status, body, type };
}

beforeAll(async () => {
  ayla = await user('ayla');
  berk = await user('berk');
  ceren = await user('ceren');
  for (const [u, name, gender, interest] of [
    [ayla, 'Ayla', 'woman', 'men'],
    [berk, 'Berk', 'man', 'women'],
    [ceren, 'Ceren', 'woman', 'men'],
  ] as const) {
    await insertProfileRow(
      u.client,
      profileRow({
        id: u.id,
        display_name: name,
        gender,
        interested_in: interest,
        lonLat: ISTANBUL_NEARBY,
      }),
    );
  }
}, 60_000);

afterAll(async () => {
  await deleteUsers(
    admin,
    users.filter((u) => !deleted.has(u.id)),
  );
});

it('serves your own photo', async () => {
  const answer = await fetchPhoto(ayla, `${ayla.id}/1.png`);
  expect(answer.status).toBe(200);
  expect(answer.type).toBe('image/png');
});

it('serves another member their photo', async () => {
  const answer = await fetchPhoto(berk, `${ayla.id}/1.png`);
  expect(answer.status).toBe(200);
});

it('refuses without a token', async () => {
  const response = await fetch(endpoint(`${ayla.id}/1.png`), {
    headers: { apikey: localStack().ANON_KEY },
  });
  expect(response.status).toBe(401);
});

it('refuses a path outside one owner folder', async () => {
  for (const path of [
    'loose.png',
    `${ayla.id}/deep/x.png`,
    `${ayla.id}/../${berk.id}/x.png`,
    'not-a-uuid/1.png',
  ]) {
    const answer = await fetchPhoto(berk, path);
    expect(answer.status, path).toBe(404);
  }
});

it('answers a block and a deletion identically', async () => {
  // Before: both readable, so the difference below is the block and the
  // deletion, not the setup.
  expect((await fetchPhoto(berk, `${ayla.id}/1.png`)).status).toBe(200);
  expect((await fetchPhoto(berk, `${ceren.id}/1.png`)).status).toBe(200);

  const blocked = await ayla.client
    .from('blocks')
    .insert({ blocker_id: ayla.id, blocked_id: berk.id });
  expect(blocked.error).toBeNull();

  const response = await fetch(
    `${localStack().API_URL}/functions/v1/delete-account`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await accessToken(ceren)}`,
        apikey: localStack().ANON_KEY,
      },
    },
  );
  expect(response.status).toBe(200);
  deleted.add(ceren.id);

  const afterBlock = await fetchPhoto(berk, `${ayla.id}/1.png`);
  const afterDelete = await fetchPhoto(berk, `${ceren.id}/1.png`);
  expect(afterBlock.status).toBe(404);
  expect(afterDelete.status).toBe(404);
  expect(afterBlock.body).toBe(afterDelete.body);
});

it('hides the photo from the person you blocked, both ways round', async () => {
  // Ayla blocked Berk above; the block hides the photo in both
  // directions, as the bucket policy does.
  const own = await ayla.client.storage
    .from('photos')
    .upload(
      `${ayla.id}/2.png`,
      new Blob([new Uint8Array([137, 80])], { type: 'image/png' }),
      { contentType: 'image/png' },
    );
  expect(own.error).toBeNull();
  expect((await fetchPhoto(berk, `${ayla.id}/2.png`)).status).toBe(404);
  expect((await fetchPhoto(ayla, `${ayla.id}/2.png`)).status).toBe(200);
});
