import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ANKARA,
  ISTANBUL,
  ISTANBUL_NEARBY,
  STARTER,
  profileRow,
} from './fixtures';
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
const PublicProfile = {
  id: z.string().uuid(),
  display_name: z.string(),
  age: z.number().int(),
  gender: z.enum(['woman', 'man', 'unspecified']),
  big_three: z.record(z.string()),
  chart: z.record(z.unknown()),
};
// strict: an extra column (location, birth_utc…) fails the parse
const DiscoverRows = z.array(
  z.object({ ...PublicProfile, distance_km: z.number().int() }).strict(),
);
const MatchProfileRows = z.array(
  z
    .object({
      ...PublicProfile,
      match_id: z.string().uuid(),
      starter_key: z.string(),
      matched_at: z.string(),
    })
    .strict(),
);
const MatchRows = z.array(
  z.object({
    a: z.string().uuid(),
    b: z.string().uuid(),
    starter_key: z.string(),
  }),
);
const LikeRows = z.array(
  z.object({ from_id: z.string().uuid(), to_id: z.string().uuid() }),
);
const PERMISSION_DENIED = '42501';
const UNDEFINED_COLUMN = '42703';
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';

let alice: TestUser; // woman, wants men, Istanbul
let bob: TestUser; // man, wants women, ~6 km away
let carol: TestUser; // man, wants women, Ankara (out of radius)
let dave: TestUser; // man, wants men (preference mismatch with Alice)
let erin: TestUser; // unspecified gender, wants everyone; third party for match visibility
let frank: TestUser; // man, wants women, nearby: the one Alice passes on
const users: TestUser[] = [];

async function user(tag: string): Promise<TestUser> {
  const u = await createUser(admin, tag);
  users.push(u); // pushed immediately so cleanup covers partial setups
  return u;
}

async function insertProfile(u: TestUser, row: ReturnType<typeof profileRow>) {
  const { error } = await u.client.from('profiles').insert(row);
  if (error)
    throw new Error(`insert profile for ${row.display_name}: ${error.message}`);
}

beforeAll(async () => {
  alice = await user('alice');
  bob = await user('bob');
  carol = await user('carol');
  dave = await user('dave');
  erin = await user('erin');
  frank = await user('frank');
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
  await insertProfile(
    frank,
    profileRow({
      id: frank.id,
      display_name: 'Frank',
      gender: 'man',
      interested_in: 'women',
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
    expect(error?.code).toBe(PERMISSION_DENIED);
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
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it("update/delete on another user's row affect 0 rows", async () => {
    const upd = await alice.client
      .from('profiles')
      .update({ display_name: 'Hacked' })
      .eq('id', bob.id)
      .select('id');
    expect(upd.error).toBeNull();
    expect(ids(upd.data)).toEqual([]);
    const del = await alice.client
      .from('profiles')
      .delete()
      .eq('id', bob.id)
      .select('id');
    expect(del.error).toBeNull();
    expect(ids(del.data)).toEqual([]);
    const stillBob = await bob.client
      .from('profiles')
      .select('display_name')
      .eq('id', bob.id)
      .single();
    expect(stillBob.data).toEqual({ display_name: 'Bob' });
  });

  it('rejects a birth date under 18 years ago', async () => {
    const minor = await user('minor');
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
    expect(error?.code).toBe(CHECK_VIOLATION);
    expect(error?.message).toMatch(/birth_date/);
  });

  it('rejects a chart that smuggles engine input', async () => {
    const leaky = await user('leaky');
    const row = profileRow({
      id: leaky.id,
      display_name: 'Leaky',
      gender: 'woman',
      interested_in: 'everyone',
      lonLat: ISTANBUL,
    });
    const { error } = await leaky.client.from('profiles').insert({
      ...row,
      chart: { ...row.chart, input: { utc: '1995-07-14T00:30:00Z' } },
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('snaps the stored location to a ~1 km grid', async () => {
    // Read the point back as text through the admin client (bypasses RLS).
    const { data, error } = await admin.rpc('profile_location_text', {
      profile_id: alice.id,
    });
    expect(error).toBeNull();
    // ISTANBUL (28.9784, 41.0082) snaps to the 0.01° node (28.98, 41.01).
    expect(data).toBe('POINT(28.98 41.01)');
  });

  it('keeps birth data and chart immutable after insert', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ birth_utc: '1996-01-01T00:00:00Z' })
      .eq('id', alice.id);
    expect(error?.code).toBe(CHECK_VIOLATION);
    const ok = await alice.client
      .from('profiles')
      .update({ display_name: 'Alice' })
      .eq('id', alice.id);
    expect(ok.error).toBeNull();
  });
});

describe('discover', () => {
  it('anon cannot use it', async () => {
    const { error } = await anonClient().from('discover').select('id');
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('shows in-radius, mutually compatible profiles only, with public columns', async () => {
    const { data, error } = await alice.client.from('discover').select('*');
    expect(error).toBeNull();
    const rows = DiscoverRows.parse(data); // strict schema: no private columns
    const seen = rows.map((r) => r.id);
    expect(seen).toContain(bob.id); // nearby, man wanting women
    expect(seen).toContain(frank.id); // nearby, man wanting women
    expect(seen).not.toContain(carol.id); // Ankara, outside 50 km
    expect(seen).not.toContain(dave.id); // wants men
    expect(seen).not.toContain(erin.id); // unspecified: only for 'everyone'
    expect(seen).not.toContain(alice.id);
    const row = rows.find((r) => r.id === bob.id);
    // Both points snap to 0.01° nodes: (28.98, 41.01) → (29.03, 41.04) ≈ 5.4 km.
    expect(row?.distance_km).toBe(5);
    const now = new Date();
    const birthdayPassed =
      now >= new Date(Date.UTC(now.getUTCFullYear(), 6, 14));
    expect(row?.age).toBe(
      now.getUTCFullYear() - 1995 - (birthdayPassed ? 0 : 1),
    );
  });

  it('refuses filters on columns it does not expose', async () => {
    const { error } = await alice.client
      .from('discover')
      .select('id')
      .gt('birth_utc', '1990-01-01');
    expect(error?.code).toBe(UNDEFINED_COLUMN);
    const order = await alice.client
      .from('discover')
      .select('id')
      .order('location');
    expect(order.error?.code).toBe(UNDEFINED_COLUMN);
  });

  it('honours the caller radius', async () => {
    try {
      const widened = await alice.client
        .from('profiles')
        .update({ radius_km: 500 })
        .eq('id', alice.id);
      expect(widened.error).toBeNull();
      const { data } = await alice.client.from('discover').select('id');
      expect(ids(data)).toContain(carol.id);
    } finally {
      await alice.client
        .from('profiles')
        .update({ radius_km: 50 })
        .eq('id', alice.id);
    }
  });

  it("shows 'everyone' seekers only profiles that accept them back", async () => {
    const { data } = await erin.client.from('discover').select('id');
    // Erin wants everyone; nobody in the fixture accepts 'unspecified'.
    expect(ids(data)).toEqual([]);
  });
});

describe('likes and matches', () => {
  it('cannot like on behalf of someone else', async () => {
    const { error } = await alice.client.from('likes').insert({
      from_id: bob.id,
      to_id: alice.id,
      kind: 'like',
      starter_key: STARTER,
    });
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('cannot insert a match directly', async () => {
    const [a, b] = pair(alice.id, bob.id);
    const { error } = await alice.client
      .from('matches')
      .insert({ a, b, starter_key: STARTER });
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('a like needs a well-formed starter key; a pass must not carry one', async () => {
    const noKey = await alice.client
      .from('likes')
      .insert({ from_id: alice.id, to_id: carol.id, kind: 'like' });
    expect(noKey.error?.code).toBe(CHECK_VIOLATION);
    const freeText = await alice.client.from('likes').insert({
      from_id: alice.id,
      to_id: carol.id,
      kind: 'like',
      starter_key: 'hey <script>',
    });
    expect(freeText.error?.code).toBe(CHECK_VIOLATION);
    const passWithKey = await alice.client.from('likes').insert({
      from_id: alice.id,
      to_id: carol.id,
      kind: 'pass',
      starter_key: STARTER,
    });
    expect(passWithKey.error?.code).toBe(CHECK_VIOLATION);
  });

  it('a pass hides a visible profile and creates no match', async () => {
    const before = await alice.client.from('discover').select('id');
    expect(ids(before.data)).toContain(frank.id);
    const { error } = await alice.client
      .from('likes')
      .insert({ from_id: alice.id, to_id: frank.id, kind: 'pass' });
    expect(error).toBeNull();
    const after = await alice.client.from('discover').select('id');
    expect(ids(after.data)).not.toContain(frank.id);
    const matches = await alice.client.from('matches').select('id');
    expect(ids(matches.data)).toEqual([]);
  });

  it('a second swipe on the same person is refused', async () => {
    const { error } = await alice.client.from('likes').insert({
      from_id: alice.id,
      to_id: frank.id,
      kind: 'like',
      starter_key: STARTER,
    });
    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it('one-sided like creates no match; mutual like creates exactly one', async () => {
    const first = await alice.client.from('likes').insert({
      from_id: alice.id,
      to_id: bob.id,
      kind: 'like',
      starter_key: STARTER,
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
      starter_key: STARTER,
    });
    expect(second.error).toBeNull();

    const forAlice = MatchRows.parse(
      (await alice.client.from('matches').select('a, b, starter_key')).data,
    );
    const forBob = MatchRows.parse(
      (await bob.client.from('matches').select('a, b, starter_key')).data,
    );
    expect(forAlice).toHaveLength(1);
    expect(forBob).toEqual(forAlice);
    const [a, b] = pair(alice.id, bob.id);
    expect(forAlice[0]).toEqual({ a, b, starter_key: STARTER });

    const total = await admin
      .from('matches')
      .select('id')
      .eq('a', a)
      .eq('b', b);
    expect(ids(total.data)).toHaveLength(1);
  });

  it('simultaneous mutual likes still produce exactly one match', async () => {
    const gina = await user('gina'); // woman, wants men, nearby
    const hank = await user('hank'); // man, wants women, nearby
    await insertProfile(
      gina,
      profileRow({
        id: gina.id,
        display_name: 'Gina',
        gender: 'woman',
        interested_in: 'men',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await insertProfile(
      hank,
      profileRow({
        id: hank.id,
        display_name: 'Hank',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    const [g, h] = await Promise.all([
      gina.client.from('likes').insert({
        from_id: gina.id,
        to_id: hank.id,
        kind: 'like',
        starter_key: STARTER,
      }),
      hank.client.from('likes').insert({
        from_id: hank.id,
        to_id: gina.id,
        kind: 'like',
        starter_key: STARTER,
      }),
    ]);
    expect(g.error).toBeNull();
    expect(h.error).toBeNull();
    const [a, b] = pair(gina.id, hank.id);
    const total = await admin
      .from('matches')
      .select('id')
      .eq('a', a)
      .eq('b', b);
    expect(ids(total.data)).toHaveLength(1);
    expect(
      ids((await gina.client.from('matches').select('id')).data),
    ).toHaveLength(1);
    expect(
      ids((await hank.client.from('matches').select('id')).data),
    ).toHaveLength(1);
  });

  it('a reciprocal like with a different starter key is refused', async () => {
    const ivy = await user('ivy'); // woman, wants men
    const jack = await user('jack'); // man, wants women
    await insertProfile(
      ivy,
      profileRow({
        id: ivy.id,
        display_name: 'Ivy',
        gender: 'woman',
        interested_in: 'men',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await insertProfile(
      jack,
      profileRow({
        id: jack.id,
        display_name: 'Jack',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    const first = await ivy.client.from('likes').insert({
      from_id: ivy.id,
      to_id: jack.id,
      kind: 'like',
      starter_key: STARTER,
    });
    expect(first.error).toBeNull();
    const second = await jack.client.from('likes').insert({
      from_id: jack.id,
      to_id: ivy.id,
      kind: 'like',
      starter_key: 'sun-square-mars',
    });
    expect(second.error?.code).toBe(CHECK_VIOLATION);
    const [a, b] = pair(ivy.id, jack.id);
    expect(
      ids(
        (await admin.from('matches').select('id').eq('a', a).eq('b', b)).data,
      ),
    ).toEqual([]);
  });

  it('match_profiles shows each side the other, with public columns only', async () => {
    const forAlice = MatchProfileRows.parse(
      (await alice.client.from('match_profiles').select('*')).data,
    );
    expect(forAlice.map((r) => r.id)).toEqual([bob.id]);
    expect(forAlice[0]?.display_name).toBe('Bob');
    expect(forAlice[0]?.starter_key).toBe(STARTER);
    const forBob = MatchProfileRows.parse(
      (await bob.client.from('match_profiles').select('*')).data,
    );
    expect(forBob.map((r) => r.id)).toEqual([alice.id]);
    const forErin = await erin.client.from('match_profiles').select('id');
    expect(ids(forErin.data)).toEqual([]);
    const anon = await anonClient().from('match_profiles').select('id');
    expect(anon.error?.code).toBe(PERMISSION_DENIED);
  });

  it('a third user cannot see the match', async () => {
    const { data, error } = await erin.client.from('matches').select('id');
    expect(error).toBeNull();
    expect(ids(data)).toEqual([]);
  });

  it('update/delete on likes and matches affect 0 rows', async () => {
    const upd = await bob.client
      .from('likes')
      .update({ kind: 'pass', starter_key: null })
      .eq('from_id', bob.id)
      .select('from_id');
    // Either RLS refuses outright or the statement matches 0 rows; never a change.
    if (upd.error) expect(upd.error.code).toBe(PERMISSION_DENIED);
    else expect(upd.data).toEqual([]);
    const stillLike = LikeRows.parse(
      (
        await bob.client
          .from('likes')
          .select('from_id, to_id')
          .eq('kind', 'like')
      ).data,
    );
    expect(stillLike).toEqual([{ from_id: bob.id, to_id: alice.id }]);
    const [a, b] = pair(alice.id, bob.id);
    const del = await alice.client
      .from('matches')
      .delete()
      .eq('a', a)
      .eq('b', b)
      .select('id');
    if (del.error) expect(del.error.code).toBe(PERMISSION_DENIED);
    else expect(del.data).toEqual([]);
    expect(
      ids((await alice.client.from('matches').select('id')).data),
    ).toHaveLength(1);
  });

  it('a user reads only their own likes', async () => {
    const { data } = await bob.client.from('likes').select('from_id, to_id');
    expect(LikeRows.parse(data)).toEqual([
      { from_id: bob.id, to_id: alice.id },
    ]);
  });
});
