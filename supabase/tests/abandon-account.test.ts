import { afterAll, expect, it } from 'vitest';
import {
  ISTANBUL_NEARBY,
  insertProfileRow,
  profileRow,
  uploadPhotos,
} from './fixtures';
import {
  adminClient,
  anonClient,
  createUser,
  deleteUsers,
  type TestUser,
} from './local';

/**
 * `abandon_empty_account()`: onboarding's "Farklı bir hesapla gir" for an
 * account Apple or Google opened (ADR-0013). It deletes the caller only
 * while the account is empty, and it is a function of its own so that a
 * server without it deletes nothing (review of PR #13, round 3).
 */

const admin = adminClient();
const users: TestUser[] = [];
/** Accounts the tests delete on purpose; cleanup must skip them. */
const deleted = new Set<string>();

async function user(tag: string): Promise<TestUser> {
  const u = await createUser(admin, tag);
  users.push(u);
  return u;
}

async function accountExists(id: string): Promise<boolean> {
  const { data } = await admin.auth.admin.getUserById(id);
  return data.user?.id === id;
}

afterAll(async () => {
  await deleteUsers(
    admin,
    users.filter((u) => !deleted.has(u.id)),
  );
});

it('deletes a caller who never made a profile', async () => {
  const empty = await user('empty');
  const { data, error } = await empty.client.rpc('abandon_empty_account');
  expect(error).toBeNull();
  expect(data).toBe(true);
  deleted.add(empty.id);
  expect(await accountExists(empty.id)).toBe(false);
});

it('refuses a caller who has a profile, and deletes nothing', async () => {
  const member = await user('member');
  await insertProfileRow(
    member.client,
    profileRow({
      id: member.id,
      display_name: 'Member',
      gender: 'woman',
      interested_in: 'everyone',
      lonLat: ISTANBUL_NEARBY,
    }),
  );
  const { data, error } = await member.client.rpc('abandon_empty_account');
  expect(error).toBeNull();
  expect(data).toBe(false);
  expect(await accountExists(member.id)).toBe(true);
  const profile = await admin.from('profiles').select('id').eq('id', member.id);
  expect(profile.data ?? []).toHaveLength(1);
});

it('refuses a caller with a photo but no profile: the photo would outlive the account', async () => {
  const uploader = await user('uploader');
  await uploadPhotos(uploader.client, [`${uploader.id}/0.png`]);
  const { data, error } = await uploader.client.rpc('abandon_empty_account');
  expect(error).toBeNull();
  expect(data).toBe(false);
  expect(await accountExists(uploader.id)).toBe(true);
});

it('is not callable without a session', async () => {
  const { data, error } = await anonClient().rpc('abandon_empty_account');
  expect(data).toBeNull();
  expect(error).not.toBeNull();
});
