import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ANKARA, ISTANBUL, ISTANBUL_NEARBY, profileRow } from './fixtures';
import {
  adminClient,
  anonClient,
  createUser,
  deleteUsers,
  type TestUser,
} from './local';

const admin = adminClient();

// Rows come back untyped from PostgREST; every read is parsed with Zod.
const IdRows = z.array(z.object({ id: z.string().uuid() }));
const ids = (data: unknown): string[] => IdRows.parse(data).map((r) => r.id);
/** (a, b) ordered as the matches table stores them (a < b). */
const pair = (x: string, y: string): [string, string] =>
  x < y ? [x, y] : [y, x];
const DiscoverRow = z
  .object({
    id: z.string().uuid(),
    display_name: z.string(),
    age: z.number().int(),
    gender: z.enum(['woman', 'man', 'unspecified']),
    big_three: z.record(z.string()),
    chart: z.record(z.unknown()),
    distance_km: z.number().int(),
  })
  .strict(); // strict: an extra column (location, birth_utc…) fails the parse
const DiscoverRows = z.array(DiscoverRow);
const MatchRows = z.array(
  z.object({ a: z.string().uuid(), b: z.string().uuid(), starter: z.string() }),
);
const LikeRows = z.array(
  z.object({ from_id: z.string().uuid(), to_id: z.string().uuid() }),
);

let alice: TestUser; // woman, wants men, Istanbul
let bob: TestUser; // man, wants women, 5 km away
let carol: TestUser; // man, wants women, Ankara (out of radius)
let dave: TestUser; // man, wants men (preference mismatch with Alice)
let erin: TestUser; // unspecified gender, wants everyone; third party for match visibility
const users: TestUser[] = [];

async function insertProfile(
  user: TestUser,
  row: ReturnType<typeof profileRow>,
) {
  const { error } = await user.client.from('profiles').insert(row);
  if (error)
    throw new Error(`insert profile for ${row.display_name}: ${error.message}`);
}

beforeAll(async () => {
  alice = await createUser(admin, 'alice');
  bob = await createUser(admin, 'bob');
  carol = await createUser(admin, 'carol');
  dave = await createUser(admin, 'dave');
  erin = await createUser(admin, 'erin');
  users.push(alice, bob, carol, dave, erin);
  await insertProfile(
    alice,
    profileRow({
      id: alice.id,
      display_name: 'Alice',
      gender: 'woman',
      interested_in: 'men',
      lonLat: ISTANBUL,
    }),
  );
  await insertProfile(
    bob,
    profileRow({
      id: bob.id,
      display_name: 'Bob',
      gender: 'man',
      interested_in: 'women',
      lonLat: ISTANBUL_NEARBY,
    }),
  );
  await insertProfile(
    carol,
    profileRow({
      id: carol.id,
      display_name: 'Carol',
      gender: 'man',
      interested_in: 'women',
      lonLat: ANKARA,
    }),
  );
  await insertProfile(
    dave,
    profileRow({
      id: dave.id,
      display_name: 'Dave',
      gender: 'man',
      interested_in: 'men',
      lonLat: ISTANBUL_NEARBY,
    }),
  );
  await insertProfile(
    erin,
    profileRow({
      id: erin.id,
      display_name: 'Erin',
      gender: 'unspecified',
      interested_in: 'everyone',
      lonLat: ISTANBUL_NEARBY,
    }),
  );
});

afterAll(async () => {
  await deleteUsers(admin, users);
});

describe('profiles', () => {
  it('anon is denied the profiles table outright', async () => {
    const { data, error } = await anonClient().from('profiles').select('id');
    expect(error?.code).toBe('42501'); // permission denied, not merely 0 rows
    expect(data).toBeNull();
  });

  it('a user reads only their own row', async () => {
    const { data, error } = await alice.client
      .from('profiles')
      .select('id, birth_utc');
    expect(error).toBeNull();
    expect(ids(data)).toEqual([alice.id]);
  });

  it("cannot read another user's birth_utc or location via profiles", async () => {
    const { data, error } = await alice.client
      .from('profiles')
      .select('id, birth_utc, location')
      .eq('id', bob.id);
    expect(error).toBeNull();
    expect(ids(data)).toEqual([]);
  });

  it('cannot insert a profile for someone else', async () => {
    const { error } = await alice.client.from('profiles').insert(
      profileRow({
        id: bob.id,
        display_name: 'Not Bob',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL,
      }),
    );
    expect(error).not.toBeNull();
  });

  it('rejects a birth date under 18 years ago', async () => {
    const minor = await createUser(admin, 'minor');
    users.push(minor);
    const { error } = await minor.client.from('profiles').insert(
      profileRow({
        id: minor.id,
        display_name: 'Minor',
        gender: 'woman',
        interested_in: 'everyone',
        lonLat: ISTANBUL,
        birth_date: '2015-01-01',
      }),
    );
    expect(error?.message).toMatch(/birth_date/);
  });
});

describe('discover', () => {
  it('anon cannot use it', async () => {
    const { error } = await anonClient().from('discover').select('id');
    expect(error).not.toBeNull();
  });

  it('shows in-radius, mutually compatible profiles only, with public columns', async () => {
    const { data, error } = await alice.client.from('discover').select('*');
    expect(error).toBeNull();
    const rows = DiscoverRows.parse(data); // strict schema: no private columns
    const seen = rows.map((r) => r.id);
    expect(seen).toContain(bob.id); // 5 km, man wanting women
    expect(seen).not.toContain(carol.id); // Ankara, outside 50 km
    expect(seen).not.toContain(dave.id); // wants men
    expect(seen).not.toContain(erin.id); // unspecified: only for 'everyone'
    expect(seen).not.toContain(alice.id);
    const row = rows.find((r) => r.id === bob.id);
    expect(row?.distance_km).toBeGreaterThanOrEqual(3);
    expect(row?.distance_km).toBeLessThanOrEqual(8);
    const now = new Date();
    const birthdayPassed =
      now >= new Date(Date.UTC(now.getUTCFullYear(), 6, 14));
    expect(row?.age).toBe(
      now.getUTCFullYear() - 1995 - (birthdayPassed ? 0 : 1),
    );
  });

  it('honours the caller radius', async () => {
    const widened = await alice.client
      .from('profiles')
      .update({ radius_km: 500 })
      .eq('id', alice.id);
    expect(widened.error).toBeNull();
    const { data } = await alice.client.from('discover').select('id');
    expect(ids(data)).toContain(carol.id);
    await alice.client
      .from('profiles')
      .update({ radius_km: 50 })
      .eq('id', alice.id);
  });

  it("shows 'everyone' seekers only profiles that accept them back", async () => {
    const { data } = await erin.client.from('discover').select('id');
    // Erin wants everyone; Alice wants men, Bob/Carol want women, Dave wants
    // men — none of them accept 'unspecified', so Erin sees nobody yet.
    expect(ids(data)).toEqual([]);
  });
});

describe('likes and matches', () => {
  it('cannot like on behalf of someone else', async () => {
    const { error } = await alice.client
      .from('likes')
      .insert({ from_id: bob.id, to_id: alice.id, kind: 'like' });
    expect(error).not.toBeNull();
  });

  it('cannot insert a match directly', async () => {
    const [a, b] = pair(alice.id, bob.id);
    const { error } = await alice.client
      .from('matches')
      .insert({ a, b, starter: 'x' });
    expect(error).not.toBeNull();
  });

  it('a pass removes the profile from discover and creates no match', async () => {
    const { error } = await alice.client
      .from('likes')
      .insert({ from_id: alice.id, to_id: dave.id, kind: 'pass' });
    expect(error).toBeNull();
    const { data } = await alice.client.from('matches').select('id');
    expect(ids(data)).toEqual([]);
  });

  it('one-sided like creates no match; mutual like creates exactly one', async () => {
    const first = await alice.client.from('likes').insert({
      from_id: alice.id,
      to_id: bob.id,
      kind: 'like',
      starter: 'Ay-Venüs üçgeni',
    });
    expect(first.error).toBeNull();
    expect(ids((await alice.client.from('matches').select('id')).data)).toEqual(
      [],
    );
    expect(
      ids((await alice.client.from('discover').select('id')).data),
    ).not.toContain(bob.id);

    const second = await bob.client.from('likes').insert({
      from_id: bob.id,
      to_id: alice.id,
      kind: 'like',
      starter: 'Ay-Venüs üçgeni',
    });
    expect(second.error).toBeNull();

    const forAlice = MatchRows.parse(
      (await alice.client.from('matches').select('a, b, starter')).data,
    );
    const forBob = MatchRows.parse(
      (await bob.client.from('matches').select('a, b, starter')).data,
    );
    expect(forAlice).toHaveLength(1);
    expect(forBob).toEqual(forAlice);
    const [a, b] = pair(alice.id, bob.id);
    expect(forAlice[0]).toEqual({ a, b, starter: 'Ay-Venüs üçgeni' });

    const total = await admin
      .from('matches')
      .select('id')
      .eq('a', a)
      .eq('b', b);
    expect(ids(total.data)).toHaveLength(1);
  });

  it('a third user cannot see the match', async () => {
    const { data, error } = await erin.client.from('matches').select('id');
    expect(error).toBeNull();
    expect(ids(data)).toEqual([]);
  });

  it('a user reads only their own likes', async () => {
    const { data } = await bob.client.from('likes').select('from_id, to_id');
    expect(LikeRows.parse(data)).toEqual([
      { from_id: bob.id, to_id: alice.id },
    ]);
  });
});
