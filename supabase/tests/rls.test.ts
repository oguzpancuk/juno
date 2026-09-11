import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { allCities } from '@juno/geo';
import type { Database, Json } from './database.types';
import {
  ANKARA,
  ISTANBUL,
  ISTANBUL_NEARBY,
  NOWHERE,
  STARTER,
  insertProfileRow,
  profileRow,
  uploadPhotos,
} from './fixtures';
import {
  adminClient,
  anonClient,
  createUser,
  deleteUsers,
  localStack,
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
const Presentation = {
  bio: z.string().nullable(),
  photos: z.array(z.string()),
};
const DiscoverRows = z.array(
  z
    .object({
      ...PublicProfile,
      ...Presentation,
      distance_km: z.number().int(),
    })
    .strict(),
);
const MatchProfileRows = z.array(
  z
    .object({
      ...PublicProfile,
      match_id: z.string().uuid(),
      starter_key: z.string(),
      matched_at: z.string(),
      last_body: z.string().nullable(),
      last_at: z.string().nullable(),
      last_sender_id: z.string().uuid().nullable(),
      unread_count: z.number().int(),
      ...Presentation,
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
const NOT_NULL_VIOLATION = '23502';
const INVALID_DATE = '22007';
const CHECK_VIOLATION = '23514';
const FOREIGN_KEY_VIOLATION = '23503';

let alice: TestUser; // woman, wants men, Istanbul
let bob: TestUser; // man, wants women, ~6 km away
let carol: TestUser; // man, wants women, Ankara (out of radius)
let dave: TestUser; // man, wants men (preference mismatch with Alice)
let erin: TestUser; // unspecified, wants everyone, isolated mid-Atlantic; third party for match visibility
let frank: TestUser; // man, wants women, nearby: the one Alice passes on
const users: TestUser[] = [];

async function user(tag: string): Promise<TestUser> {
  const u = await createUser(admin, tag);
  users.push(u); // pushed immediately so cleanup covers partial setups
  return u;
}

async function accessToken(u: TestUser): Promise<string> {
  const { data } = await u.client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('no session for the test user');
  return token;
}

async function insertProfile(u: TestUser, row: ReturnType<typeof profileRow>) {
  await insertProfileRow(u.client, row);
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
      lonLat: NOWHERE,
      radius_km: 5,
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
        // The photo trigger runs before the CHECK, so this row carries
        // none: the assertion is about the age rule.
        photos: [],
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
    // Refused by the column grant before the immutability trigger is
    // reached: members hold UPDATE only on the columns they may change.
    // The trigger stays as the guard for anything running as the owner.
    expect(error?.code).toBe(PERMISSION_DENIED);
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

  it('honours the age range in both directions', async () => {
    // Mine: narrow my range past Bob's age and he goes.
    const bobAge = (
      await alice.client.from('discover').select('id, age')
    ).data?.find((r) => r.id === bob.id)?.age;
    expect(bobAge).toBeGreaterThan(0);

    await alice.client
      .from('profiles')
      .update({ age_min: (bobAge ?? 0) + 1, age_max: 99 })
      .eq('id', alice.id);
    const narrowed = await alice.client.from('discover').select('id');
    expect(narrowed.data?.map((r) => r.id)).not.toContain(bob.id);

    await alice.client
      .from('profiles')
      .update({ age_min: 18, age_max: 99 })
      .eq('id', alice.id);
    const restored = await alice.client.from('discover').select('id');
    expect(restored.data?.map((r) => r.id)).toContain(bob.id);

    // Theirs: Bob narrowing past *my* age takes me out of his deck and him
    // out of mine. A one-way filter would put me in front of someone who
    // asked not to see me.
    const aliceAge = (
      await bob.client.from('discover').select('id, age')
    ).data?.find((r) => r.id === alice.id)?.age;
    expect(aliceAge).toBeGreaterThan(0);
    await bob.client
      .from('profiles')
      .update({ age_min: (aliceAge ?? 0) + 1 })
      .eq('id', bob.id);

    const mine = await alice.client.from('discover').select('id');
    expect(mine.data?.map((r) => r.id)).not.toContain(bob.id);
    const theirs = await bob.client.from('discover').select('id');
    expect(theirs.data?.map((r) => r.id)).not.toContain(alice.id);

    await bob.client.from('profiles').update({ age_min: 18 }).eq('id', bob.id);
  });

  it('refuses a range that is inverted or under eighteen', async () => {
    const inverted = await alice.client
      .from('profiles')
      .update({ age_min: 40, age_max: 30 })
      .eq('id', alice.id);
    expect(inverted.error?.code).toBe(CHECK_VIOLATION);

    const underage = await alice.client
      .from('profiles')
      .update({ age_min: 17 })
      .eq('id', alice.id);
    expect(underage.error?.code).toBe(CHECK_VIOLATION);
  });

  it('keeps the two client-side preferences inside their domains', async () => {
    // The band and the element are applied on the device, so the database
    // can only guarantee the value is one the client knows how to read.
    const badBand = await alice.client
      .from('profiles')
      .update({ min_band: 'excellent' })
      .eq('id', alice.id);
    expect(badBand.error?.code).toBe(CHECK_VIOLATION);

    const badElement = await alice.client
      .from('profiles')
      .update({ sun_elements: ['fire', 'plasma'] })
      .eq('id', alice.id);
    expect(badElement.error?.code).toBe(CHECK_VIOLATION);

    // Empty would mean nobody, which nobody intends; null means everyone.
    const empty = await alice.client
      .from('profiles')
      .update({ sun_elements: [] })
      .eq('id', alice.id);
    expect(empty.error?.code).toBe(CHECK_VIOLATION);

    const ok = await alice.client
      .from('profiles')
      .update({ min_band: 'strong', sun_elements: ['fire', 'air'] })
      .eq('id', alice.id);
    expect(ok.error).toBeNull();

    await alice.client
      .from('profiles')
      .update({ min_band: 'quiet', sun_elements: null })
      .eq('id', alice.id);
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
    // Erin sits mid-Atlantic with a 5 km radius, so rows left by manual
    // testing cannot leak in; the assertion stays strict.
    const { data } = await erin.client.from('discover').select('id');
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

describe('messages', () => {
  // A fresh matched pair, made the real way (mutual like → trigger), so the
  // message tests do not depend on the order of the block above.
  let ivan: TestUser; // man, wants women, nearby
  let jane: TestUser; // woman, wants men, nearby
  let matchId: string;
  // A second thread, far from everyone else, for the cross-thread reply.
  let kate: TestUser; // woman, wants men, South Pacific
  let leo: TestUser; // man, wants women, same point
  let otherThreadMessageId: string;
  const FAR_PACIFIC: readonly [number, number] = [-150.0, -40.0];

  const MessageRows = z.array(
    z
      .object({
        id: z.string().uuid(),
        match_id: z.string().uuid(),
        sender_id: z.string().uuid(),
        body: z.string(),
        reply_to: z.string().uuid().nullable(),
        read_at: z.string().nullable(),
        created_at: z.string(),
      })
      .strict(),
  );

  // `tests/database.types.ts` is regenerated on main once the reply_to
  // migration is applied to the shared stack, and the typed client
  // rejects a column the generated file does not know. Until then the
  // column is declared on the way in; both helpers stay correct after
  // the regeneration and can be dropped for plain literals then.
  type MessageInsert = Database['public']['Tables']['messages']['Insert'];
  type MessageUpdate = Database['public']['Tables']['messages']['Update'];
  const withReply = (
    row: MessageInsert & { reply_to: string | null },
  ): MessageInsert => row;
  const replyPatch = (
    patch: MessageUpdate & { reply_to: string | null },
  ): MessageUpdate => patch;

  beforeAll(async () => {
    ivan = await user('ivan');
    jane = await user('jane');
    await insertProfile(
      ivan,
      profileRow({
        id: ivan.id,
        display_name: 'Ivan',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await insertProfile(
      jane,
      profileRow({
        id: jane.id,
        display_name: 'Jane',
        gender: 'woman',
        interested_in: 'men',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await ivan.client.from('likes').insert({
      from_id: ivan.id,
      to_id: jane.id,
      kind: 'like',
      starter_key: STARTER,
    });
    await jane.client.from('likes').insert({
      from_id: jane.id,
      to_id: ivan.id,
      kind: 'like',
      starter_key: STARTER,
    });
    const rows = MatchProfileRows.parse(
      (await ivan.client.from('match_profiles').select('*')).data,
    );
    const mine = rows.find((r) => r.id === jane.id);
    if (!mine) throw new Error('setup: ivan and jane are not matched');
    matchId = mine.match_id;

    kate = await user('kate');
    leo = await user('leo');
    await insertProfile(
      kate,
      profileRow({
        id: kate.id,
        display_name: 'Kate',
        gender: 'woman',
        interested_in: 'men',
        lonLat: FAR_PACIFIC,
        radius_km: 5,
      }),
    );
    await insertProfile(
      leo,
      profileRow({
        id: leo.id,
        display_name: 'Leo',
        gender: 'man',
        interested_in: 'women',
        lonLat: FAR_PACIFIC,
        radius_km: 5,
      }),
    );
    await kate.client.from('likes').insert({
      from_id: kate.id,
      to_id: leo.id,
      kind: 'like',
      starter_key: STARTER,
    });
    await leo.client.from('likes').insert({
      from_id: leo.id,
      to_id: kate.id,
      kind: 'like',
      starter_key: STARTER,
    });
    const theirs = MatchProfileRows.parse(
      (await kate.client.from('match_profiles').select('*')).data,
    ).find((r) => r.id === leo.id);
    if (!theirs) throw new Error('setup: kate and leo are not matched');
    const posted = await kate.client
      .from('messages')
      .insert({
        match_id: theirs.match_id,
        sender_id: kate.id,
        body: 'Başka bir sohbet',
      })
      .select('id')
      .single();
    otherThreadMessageId = z
      .object({ id: z.string().uuid() })
      .parse(posted.data).id;
  });

  it('anon is denied the messages table outright', async () => {
    const { data, error } = await anonClient().from('messages').select('id');
    // The grant is revoked, so this is a privilege error, not an empty read:
    // a future migration that re-grants anon fails here even if RLS holds.
    expect(error?.code).toBe(PERMISSION_DENIED);
    expect(data).toBeNull();
  });

  it('both members see a message; a third user sees none and cannot write', async () => {
    const sent = await ivan.client
      .from('messages')
      .insert({ match_id: matchId, sender_id: ivan.id, body: 'Merhaba Jane' })
      .select('*');
    expect(sent.error).toBeNull();
    expect(MessageRows.parse(sent.data)).toHaveLength(1);

    const forJane = MessageRows.parse(
      (await jane.client.from('messages').select('*')).data,
    );
    expect(forJane.map((m) => m.body)).toEqual(['Merhaba Jane']);
    expect(forJane[0]?.read_at).toBeNull();

    // Carol is in neither side of the match.
    const forCarol = await carol.client.from('messages').select('*');
    expect(MessageRows.parse(forCarol.data ?? [])).toEqual([]);
    const byCarol = await carol.client
      .from('messages')
      .insert({ match_id: matchId, sender_id: carol.id, body: 'sızma' });
    expect(byCarol.error?.code).toBe(PERMISSION_DENIED);
  });

  it('a member cannot post as the other member', async () => {
    const { error } = await ivan.client
      .from('messages')
      .insert({ match_id: matchId, sender_id: jane.id, body: 'sahte' });
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('an empty or whitespace-only body is refused', async () => {
    for (const body of ['', '   ', '\n\t ']) {
      const { error } = await ivan.client
        .from('messages')
        .insert({ match_id: matchId, sender_id: ivan.id, body });
      expect(error?.code).toBe(CHECK_VIOLATION);
    }
  });

  it('only the recipient marks a message read, and no one edits it', async () => {
    const mine = MessageRows.parse(
      (await ivan.client.from('messages').select('*')).data,
    );
    const first = mine[0];
    if (!first) throw new Error('no message to mark');

    // The sender marking their own message read matches no row.
    const bySender = await ivan.client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', first.id)
      .select('id');
    expect(bySender.error).toBeNull();
    expect(bySender.data).toEqual([]);

    const byRecipient = await jane.client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', first.id)
      .select('read_at');
    expect(byRecipient.error).toBeNull();
    expect(byRecipient.data).toHaveLength(1);

    const edit = await jane.client
      .from('messages')
      .update({ body: 'değiştirildi' })
      .eq('id', first.id);
    expect(edit.error?.code).toBe(CHECK_VIOLATION);

    const byCarol = await carol.client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', first.id)
      .select('id');
    expect(byCarol.error).toBeNull();
    expect(byCarol.data).toEqual([]);
  });

  it('messages cannot be deleted by either member', async () => {
    const mine = MessageRows.parse(
      (await ivan.client.from('messages').select('*')).data,
    );
    const first = mine[0];
    if (!first) throw new Error('no message to delete');
    const del = await ivan.client
      .from('messages')
      .delete()
      .eq('id', first.id)
      .select('id');
    if (del.error) expect(del.error.code).toBe(PERMISSION_DENIED);
    else expect(del.data).toEqual([]);
    expect(
      MessageRows.parse((await ivan.client.from('messages').select('*')).data),
    ).toHaveLength(1);
  });

  it('the conversation list carries the last message and the unread count', async () => {
    const second = await jane.client
      .from('messages')
      .insert({ match_id: matchId, sender_id: jane.id, body: 'Selam Ivan' });
    expect(second.error).toBeNull();

    const forIvan = MatchProfileRows.parse(
      (await ivan.client.from('match_profiles').select('*')).data,
    ).find((r) => r.match_id === matchId);
    expect(forIvan?.last_body).toBe('Selam Ivan');
    expect(forIvan?.last_sender_id).toBe(jane.id);
    expect(forIvan?.unread_count).toBe(1);

    // Jane read Ivan's only message above, and her own never counts.
    const forJane = MatchProfileRows.parse(
      (await jane.client.from('match_profiles').select('*')).data,
    ).find((r) => r.match_id === matchId);
    expect(forJane?.last_body).toBe('Selam Ivan');
    expect(forJane?.unread_count).toBe(0);
  });

  it('the server owns created_at and read_at on insert', async () => {
    const future = '2999-01-01T00:00:00Z';
    const sent = await ivan.client
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: ivan.id,
        body: 'zaman oyunu',
        created_at: future,
        read_at: future,
      })
      .select('*')
      .single();
    expect(sent.error).toBeNull();
    const row = MessageRows.parse([sent.data])[0];
    // A chosen created_at would pin this message to the top of the other
    // person's conversation list for good; a preset read_at would hide it
    // from their unread count.
    expect(row?.read_at).toBeNull();
    expect(new Date(row?.created_at ?? 0).getUTCFullYear()).toBe(
      new Date().getUTCFullYear(),
    );
  });

  it('a read receipt is stamped by the server and cannot be cleared', async () => {
    const unread = MessageRows.parse(
      (
        await jane.client
          .from('messages')
          .select('*')
          .eq('sender_id', ivan.id)
          .is('read_at', null)
      ).data,
    )[0];
    if (!unread) throw new Error('no unread message to mark');

    // A future value satisfies the CHECK, so only the server's stamp keeps
    // it honest; a backdated one would fail the CHECK as well.
    const ahead = await jane.client
      .from('messages')
      .update({ read_at: '2999-01-01T00:00:00Z' })
      .eq('id', unread.id)
      .select('read_at')
      .single();
    expect(ahead.error).toBeNull();
    expect(
      new Date(
        z.object({ read_at: z.string() }).parse(ahead.data).read_at,
      ).getUTCFullYear(),
    ).toBe(new Date().getUTCFullYear());

    const backdated = await jane.client
      .from('messages')
      .update({ read_at: '1970-01-01T00:00:00Z' })
      .eq('id', unread.id)
      .select('read_at')
      .single();
    expect(backdated.error).toBeNull();
    const stamped = z
      .object({ read_at: z.string() })
      .parse(backdated.data).read_at;
    expect(new Date(stamped).getUTCFullYear()).toBe(
      new Date().getUTCFullYear(),
    );

    const cleared = await jane.client
      .from('messages')
      .update({ read_at: null })
      .eq('id', unread.id);
    expect(cleared.error?.code).toBe(CHECK_VIOLATION);
  });

  it('a message needs a match: no match id, no thread', async () => {
    const orphan = '00000000-0000-4000-8000-000000000000';
    const { error } = await ivan.client
      .from('messages')
      .insert({ match_id: orphan, sender_id: ivan.id, body: 'boşluğa' });
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('a reply names an earlier message of the same thread and is echoed back', async () => {
    const hers = MessageRows.parse(
      (await ivan.client.from('messages').select('*')).data,
    ).find((m) => m.sender_id === jane.id);
    if (!hers) throw new Error('no message of Jane to reply to');
    const sent = await ivan.client
      .from('messages')
      .insert(
        withReply({
          match_id: matchId,
          sender_id: ivan.id,
          body: 'Selam, seni duydum',
          reply_to: hers.id,
        }),
      )
      .select('*')
      .single();
    expect(sent.error).toBeNull();
    expect(MessageRows.parse([sent.data])[0]?.reply_to).toBe(hers.id);

    // The other side reads the pointer too: the quote is resolved from
    // the loaded window on both phones, never fetched again.
    const forJane = MessageRows.parse(
      (await jane.client.from('messages').select('*')).data,
    ).filter((m) => m.reply_to === hers.id);
    expect(forJane.map((m) => m.body)).toEqual(['Selam, seni duydum']);
  });

  it('a reply cannot point into another thread', async () => {
    // Kate's message exists, in a match Ivan is no part of. The foreign
    // key alone would accept it; the trigger is what refuses it.
    const { error } = await ivan.client.from('messages').insert(
      withReply({
        match_id: matchId,
        sender_id: ivan.id,
        body: 'yanlış sohbet',
        reply_to: otherThreadMessageId,
      }),
    );
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('a reply to a message that does not exist is a foreign key error', async () => {
    const ghost = '00000000-0000-4000-8000-00000000abcd';
    const { error } = await ivan.client.from('messages').insert(
      withReply({
        match_id: matchId,
        sender_id: ivan.id,
        body: 'hayalete',
        reply_to: ghost,
      }),
    );
    expect(error?.code).toBe(FOREIGN_KEY_VIOLATION);
  });

  it('a message cannot quote itself', async () => {
    const id = crypto.randomUUID();
    const { error } = await ivan.client.from('messages').insert(
      withReply({
        id,
        match_id: matchId,
        sender_id: ivan.id,
        body: 'kendime',
        reply_to: id,
      }),
    );
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('reply_to is frozen after insert; the receipt still lands', async () => {
    // Ivan's reply from above. Jane is its recipient, the only role the
    // update policy admits, so a refusal here is the trigger's, not RLS's.
    const reply = MessageRows.parse(
      (await jane.client.from('messages').select('*')).data,
    ).find((m) => m.reply_to !== null);
    if (!reply) throw new Error('no reply to re-point');

    const cleared = await jane.client
      .from('messages')
      .update(replyPatch({ reply_to: null }))
      .eq('id', reply.id);
    expect(cleared.error?.code).toBe(CHECK_VIOLATION);

    const repointed = await jane.client
      .from('messages')
      .update(replyPatch({ reply_to: otherThreadMessageId }))
      .eq('id', reply.id);
    expect(repointed.error?.code).toBe(CHECK_VIOLATION);

    const read = await jane.client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', reply.id)
      .select('read_at, reply_to');
    expect(read.error).toBeNull();
    expect(
      z
        .array(
          z.object({
            read_at: z.string(),
            reply_to: z.string().uuid().nullable(),
          }),
        )
        .parse(read.data)
        .map((m) => m.reply_to),
    ).toEqual([reply.reply_to]);
  });
});

describe('blocks and reports', () => {
  // A fresh matched pair, so the block tests do not disturb the threads
  // asserted above.
  let kemal: TestUser; // man, wants women, nearby
  let lale: TestUser; // woman, wants men, nearby
  let matchId: string;
  let messageId: string;

  const BlockRows = z.array(
    z.object({
      blocker_id: z.string().uuid(),
      blocked_id: z.string().uuid(),
    }),
  );
  // `my_reports` is the reporter's own view: no reporter_id (it is always
  // them) and a masked subject.
  const ReportRows = z.array(
    z
      .object({
        id: z.string().uuid(),
        reported_id: z.string().uuid().nullable(),
        reason: z.string(),
        note: z.string().nullable(),
        created_at: z.string(),
      })
      .strict(),
  );

  beforeAll(async () => {
    kemal = await user('kemal');
    lale = await user('lale');
    await insertProfile(
      kemal,
      profileRow({
        id: kemal.id,
        display_name: 'Kemal',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await insertProfile(
      lale,
      profileRow({
        id: lale.id,
        display_name: 'Lale',
        gender: 'woman',
        interested_in: 'men',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await kemal.client.from('likes').insert({
      from_id: kemal.id,
      to_id: lale.id,
      kind: 'like',
      starter_key: STARTER,
    });
    await lale.client.from('likes').insert({
      from_id: lale.id,
      to_id: kemal.id,
      kind: 'like',
      starter_key: STARTER,
    });
    const rows = MatchProfileRows.parse(
      (await kemal.client.from('match_profiles').select('*')).data,
    );
    const mine = rows.find((r) => r.id === lale.id);
    if (!mine) throw new Error('setup: kemal and lale are not matched');
    matchId = mine.match_id;
    const sent = await kemal.client
      .from('messages')
      .insert({ match_id: matchId, sender_id: kemal.id, body: 'Merhaba Lale' })
      .select('id')
      .single();
    messageId = z.object({ id: z.string().uuid() }).parse(sent.data).id;
  });

  it('anon is denied blocks and reports outright', async () => {
    const anon = anonClient();
    const blocks = await anon.from('blocks').select('blocker_id');
    expect(blocks.error?.code).toBe(PERMISSION_DENIED);
    const reports = await anon.from('reports').select('id');
    expect(reports.error?.code).toBe(PERMISSION_DENIED);
  });

  it('cannot block or report on someone else behalf, or yourself', async () => {
    const forOther = await kemal.client
      .from('blocks')
      .insert({ blocker_id: lale.id, blocked_id: kemal.id });
    expect(forOther.error?.code).toBe(PERMISSION_DENIED);

    const self = await kemal.client
      .from('blocks')
      .insert({ blocker_id: kemal.id, blocked_id: kemal.id });
    expect(self.error?.code).toBe(CHECK_VIOLATION);

    const reportForOther = await kemal.client.from('reports').insert({
      reporter_id: lale.id,
      reported_id: kemal.id,
      reason: 'spam',
    });
    expect(reportForOther.error?.code).toBe(PERMISSION_DENIED);

    const reportSelf = await kemal.client.from('reports').insert({
      reporter_id: kemal.id,
      reported_id: kemal.id,
      reason: 'spam',
    });
    expect(reportSelf.error?.code).toBe(CHECK_VIOLATION);
  });

  it('a block closes discovery, the match and the thread on both sides', async () => {
    // Before: both sides see the match and the message.
    expect(
      MatchProfileRows.parse(
        (await lale.client.from('match_profiles').select('*')).data,
      ),
    ).toHaveLength(1);

    const blocked = await lale.client
      .from('blocks')
      .insert({ blocker_id: lale.id, blocked_id: kemal.id });
    expect(blocked.error).toBeNull();

    for (const side of [lale, kemal]) {
      expect(
        MatchProfileRows.parse(
          (await side.client.from('match_profiles').select('*')).data,
        ).filter((r) => r.match_id === matchId),
      ).toEqual([]);
      const messages = await side.client
        .from('messages')
        .select('id')
        .eq('match_id', matchId);
      expect(ids(messages.data ?? [])).toEqual([]);
      expect(
        ids((await side.client.from('discover').select('id')).data),
      ).not.toContain(side === lale ? kemal.id : lale.id);
    }

    // Neither side can write into a closed thread.
    const write = await kemal.client
      .from('messages')
      .insert({ match_id: matchId, sender_id: kemal.id, body: 'hâlâ burada' });
    expect(write.error?.code).toBe(PERMISSION_DENIED);

    // The read receipt is closed too: no update reaches the row.
    const receipt = await lale.client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .select('id');
    expect(receipt.error).toBeNull();
    expect(receipt.data).toEqual([]);
  });

  it('the blocked list names who you blocked, and nobody else', async () => {
    // Lale blocked Kemal in the test above. The list has to carry a name:
    // profiles are not readable across accounts, so without the view the
    // screen could only show a uuid.
    const Rows = z.array(
      z
        .object({
          blocked_id: z.string().uuid(),
          display_name: z.string(),
          created_at: z.string(),
        })
        .strict(),
    );
    const mine = Rows.parse(
      (await lale.client.from('my_blocks').select('*')).data,
    );
    expect(mine.map((r) => r.blocked_id)).toEqual([kemal.id]);
    expect(mine[0]?.display_name).toBe('Kemal');

    // The other side sees nothing: being blocked is not a fact the app
    // hands out.
    const theirs = Rows.parse(
      (await kemal.client.from('my_blocks').select('*')).data,
    );
    expect(theirs).toEqual([]);

    // And nobody can write through the view.
    const written = await lale.client
      .from('my_blocks')
      .delete()
      .eq('blocked_id', kemal.id);
    expect(written.error).not.toBeNull();
  });

  it('the list holds the name as it was, not a live read', async () => {
    // One insert into `blocks` used to open a live join on `profiles`:
    // block any id you have seen and you could read that person's current
    // name, every rename, and whether the account still existed — from
    // the side they had blocked. The name is a snapshot now.
    const renamed = await kemal.client
      .from('profiles')
      .update({ display_name: 'Kemal Yeni' })
      .eq('id', kemal.id);
    expect(renamed.error).toBeNull();

    const rows = z
      .array(z.object({ display_name: z.string() }))
      .parse((await lale.client.from('my_blocks').select('display_name')).data);
    expect(rows[0]?.display_name).toBe('Kemal');

    await kemal.client
      .from('profiles')
      .update({ display_name: 'Kemal' })
      .eq('id', kemal.id);
  });

  it('a block hides the match row itself, not just the profile view', async () => {
    // `matches` present while `match_profiles` is empty would say "you were
    // blocked" as loudly as the block row does; a deleted account takes its
    // match with it, so both cases have to look the same.
    for (const side of [lale, kemal]) {
      const rows = await side.client.from('matches').select('id');
      expect(ids(rows.data ?? [])).not.toContain(matchId);
    }
  });

  it('a block and a report reach discover on their own, without a like', async () => {
    // Oya and Polat never swipe each other, so the like filter cannot
    // stand in for the block and report filters being there.
    const oya = await user('oya');
    const polat = await user('polat');
    await insertProfile(
      oya,
      profileRow({
        id: oya.id,
        display_name: 'Oya',
        gender: 'woman',
        interested_in: 'men',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await insertProfile(
      polat,
      profileRow({
        id: polat.id,
        display_name: 'Polat',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    expect(
      ids((await oya.client.from('discover').select('id')).data),
    ).toContain(polat.id);
    expect(
      ids((await polat.client.from('discover').select('id')).data),
    ).toContain(oya.id);

    const blocked = await oya.client
      .from('blocks')
      .insert({ blocker_id: oya.id, blocked_id: polat.id });
    expect(blocked.error).toBeNull();
    expect(
      ids((await oya.client.from('discover').select('id')).data),
    ).not.toContain(polat.id);
    expect(
      ids((await polat.client.from('discover').select('id')).data),
    ).not.toContain(oya.id);

    await oya.client
      .from('blocks')
      .delete()
      .eq('blocker_id', oya.id)
      .eq('blocked_id', polat.id);
    expect(
      ids((await oya.client.from('discover').select('id')).data),
    ).toContain(polat.id);

    const filed = await oya.client
      .from('reports')
      .insert({ reporter_id: oya.id, reported_id: polat.id, reason: 'spam' });
    expect(filed.error).toBeNull();
    expect(
      ids((await oya.client.from('discover').select('id')).data),
    ).not.toContain(polat.id);
    // Reporting is one-way: Polat's deck is untouched.
    expect(
      ids((await polat.client.from('discover').select('id')).data),
    ).toContain(oya.id);
  });

  it('a block hides the like row that would give it away', async () => {
    // The blocked person's own like row for the blocker used to survive a
    // block and vanish on a deletion, which named the block outright.
    const forKemal = LikeRows.parse(
      (await kemal.client.from('likes').select('from_id, to_id')).data,
    );
    expect(forKemal.map((l) => l.to_id)).not.toContain(lale.id);
    // And they cannot like again to test the water.
    const relike = await kemal.client.from('likes').insert({
      from_id: kemal.id,
      to_id: lale.id,
      kind: 'like',
      starter_key: STARTER,
    });
    expect(relike.error?.code).toBe(PERMISSION_DENIED);
  });

  it('the blocked person cannot see the block', async () => {
    expect(
      BlockRows.parse(
        (await kemal.client.from('blocks').select('blocker_id, blocked_id'))
          .data,
      ),
    ).toEqual([]);
    expect(
      BlockRows.parse(
        (await lale.client.from('blocks').select('blocker_id, blocked_id'))
          .data,
      ),
    ).toEqual([{ blocker_id: lale.id, blocked_id: kemal.id }]);
  });

  it('unblocking restores the match and the thread', async () => {
    const removed = await lale.client
      .from('blocks')
      .delete()
      .eq('blocker_id', lale.id)
      .eq('blocked_id', kemal.id)
      .select('blocked_id');
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);

    for (const side of [lale, kemal]) {
      expect(
        MatchProfileRows.parse(
          (await side.client.from('match_profiles').select('*')).data,
        ).filter((r) => r.match_id === matchId),
      ).toHaveLength(1);
      const messages = await side.client
        .from('messages')
        .select('id')
        .eq('match_id', matchId);
      expect(ids(messages.data ?? [])).toEqual([messageId]);
    }
  });

  it('a report is stored and hides the profile from the reporter only', async () => {
    const filed = await lale.client.from('reports').insert({
      reporter_id: lale.id,
      reported_id: kemal.id,
      reason: 'harassment',
      note: 'Rahatsız edici mesajlar',
    });
    expect(filed.error).toBeNull();
    // The table itself is not readable; the reporter sees their own view.
    const direct = await lale.client.from('reports').select('id');
    expect(direct.error?.code).toBe(PERMISSION_DENIED);
    const row = ReportRows.parse(
      (await lale.client.from('my_reports').select('*')).data,
    )[0];
    expect(row?.reason).toBe('harassment');
    expect(row?.reported_id).toBe(kemal.id);

    expect(
      ids((await lale.client.from('discover').select('id')).data),
    ).not.toContain(kemal.id);
    // One-way: reporting is not blocking, so Kemal's side is untouched.
    expect(
      MatchProfileRows.parse(
        (await kemal.client.from('match_profiles').select('*')).data,
      ),
    ).toHaveLength(1);
  });

  it('the same pair and reason cannot be reported twice', async () => {
    const second = await lale.client.from('reports').insert({
      reporter_id: lale.id,
      reported_id: kemal.id,
      reason: 'harassment',
    });
    // The pair was reported in the test above; a second tap is the same
    // complaint, and the client treats the conflict as "already filed".
    expect(second.error?.code).toBe(UNIQUE_VIOLATION);
  });

  it('a report cannot be edited, withdrawn or read by the reported person', async () => {
    const mine = ReportRows.parse(
      (await lale.client.from('my_reports').select('*')).data,
    );
    const first = mine[0];
    if (!first) throw new Error('no report to test');

    expect(
      ReportRows.parse(
        (await kemal.client.from('my_reports').select('*')).data,
      ),
    ).toEqual([]);

    const edit = await lale.client
      .from('reports')
      .update({ reason: 'spam' })
      .eq('id', first.id)
      .select('id');
    // The table is not selectable either, so an update cannot return rows.
    if (edit.error) expect(edit.error.code).toBe(PERMISSION_DENIED);
    else expect(edit.data).toEqual([]);

    const withdraw = await lale.client
      .from('reports')
      .delete()
      .eq('id', first.id)
      .select('id');
    if (withdraw.error) expect(withdraw.error.code).toBe(PERMISSION_DENIED);
    else expect(withdraw.data).toEqual([]);

    expect(
      ReportRows.parse((await lale.client.from('my_reports').select('*')).data),
    ).toHaveLength(1);
  });

  it('a blocked subject is masked in my_reports, note and all', async () => {
    // Its own block, filed after it, and removed again: the mask is the
    // only thing between the reporter and "they blocked me".
    const blocked = await lale.client
      .from('blocks')
      .insert({ blocker_id: lale.id, blocked_id: kemal.id });
    expect(blocked.error).toBeNull();
    const filed = await lale.client.from('reports').insert({
      reporter_id: lale.id,
      reported_id: kemal.id,
      reason: 'nudity',
      note: 'Kemal hakkında not',
    });
    expect(filed.error).toBeNull();

    const masked = ReportRows.parse(
      (await lale.client.from('my_reports').select('*')).data,
    ).find((r) => r.reason === 'nudity');
    expect(masked).toBeDefined();
    // Both columns go, or "id null but note present" names the block.
    expect(masked?.reported_id).toBeNull();
    expect(masked?.note).toBeNull();
    // And the filter cannot classify the rows either.
    const byNote = ReportRows.parse(
      (
        await lale.client
          .from('my_reports')
          .select('*')
          .is('reported_id', null)
          .not('note', 'is', null)
      ).data,
    );
    expect(byNote).toEqual([]);

    await lale.client
      .from('blocks')
      .delete()
      .eq('blocker_id', lale.id)
      .eq('blocked_id', kemal.id);
  });

  it('a missing counterpart is a to_id foreign key error', async () => {
    // apps/mobile/lib/discover.ts reads this constraint name out of the
    // message to tell "they deleted their account" from "our own profile
    // is gone"; PostgREST redacts the column from `details`.
    const ghost = '00000000-0000-4000-8000-000000000000';
    const { error } = await lale.client.from('likes').insert({
      from_id: lale.id,
      to_id: ghost,
      kind: 'pass',
    });
    expect(error?.code).toBe('23503');
    expect(error?.message).toContain('likes_to_id_fkey');
  });

  it('reports keep no write grants beyond the insert', async () => {
    const del = await lale.client
      .from('reports')
      .delete()
      .neq('id', '00000000-0000-4000-8000-000000000000')
      .select('id');
    expect(del.error?.code).toBe(PERMISSION_DENIED);
  });

  it('my_reports is read-only', async () => {
    const anyId = '00000000-0000-4000-8000-000000000000';
    const edit = await lale.client
      .from('my_reports')
      .update({ reason: 'spam' })
      .neq('id', anyId)
      .select('id');
    expect(edit.error?.code).toBe(PERMISSION_DENIED);
    const withdraw = await lale.client
      .from('my_reports')
      .delete()
      .neq('id', anyId)
      .select('id');
    expect(withdraw.error?.code).toBe(PERMISSION_DENIED);
    // The records are still there for moderation.
    expect(
      ReportRows.parse((await lale.client.from('my_reports').select('*')).data)
        .length,
    ).toBeGreaterThan(0);
  });

  it('a report needs a reason the enum knows', async () => {
    // A pair with no report yet, so a rejected insert cannot be the
    // pair-and-reason unique index doing the work.
    const { error } = await lale.client.from('reports').insert({
      reporter_id: lale.id,
      reported_id: carol.id,
      // why: deliberately outside the enum; the client type forbids it.
      reason: 'because-i-say-so' as 'spam',
    });
    expect(error?.code).not.toBe(UNIQUE_VIOLATION);
    expect(error?.code).toBe('22P02'); // invalid input value for enum
  });

  it('my_reports comes back in filing order, not in tuple order', async () => {
    // Physical order is an oracle: a deletion rewrites the row and moves
    // it to the end of an unordered scan, a block leaves it in place, so
    // an unordered read would sort the two fates apart.
    const rows = ReportRows.parse(
      (await lale.client.from('my_reports').select('*')).data,
    );
    expect(rows.length).toBeGreaterThan(1);
    const times = rows.map((r) => r.created_at);
    expect([...times].sort()).toEqual(times);
  });

  it('a report must name both sides', async () => {
    const { error } = await lale.client.from('reports').insert({
      reporter_id: lale.id,
      // why: the column is nullable only so the FK can null it later; the
      // client type still requires a uuid.
      reported_id: null as unknown as string,
      reason: 'spam',
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('a second reason about the same person is a new report', async () => {
    const escalation = await lale.client.from('reports').insert({
      reporter_id: lale.id,
      reported_id: kemal.id,
      reason: 'underage',
    });
    expect(escalation.error).toBeNull();
    const mine = ReportRows.parse(
      (
        await lale.client
          .from('my_reports')
          .select('*')
          .eq('reported_id', kemal.id)
      ).data,
    );
    const reasons = mine.map((r) => r.reason);
    // The escalation is a new row beside the first complaint, not a
    // silent no-op on it.
    expect(reasons).toContain('harassment');
    expect(reasons).toContain('underage');
  });
});

describe('birth instant', () => {
  // A phone with stale tzdata converts a birth time with an offset that
  // was right years ago; the chart is then wrong by an hour and nothing
  // says so. The server checks the instant against the city's zone.
  let vedat: TestUser;

  const row = (over: Record<string, unknown>) => ({
    ...profileRow({
      id: vedat.id,
      display_name: 'Vedat',
      gender: 'man',
      interested_in: 'women',
      lonLat: ISTANBUL_NEARBY,
      photos: [],
    }),
    ...over,
  });

  beforeAll(async () => {
    vedat = await user('vedat');
  });

  it('refuses an instant that does not match the city and wall clock', async () => {
    // One hour out: exactly what a stale zone database produces.
    const { error } = await vedat.client
      .from('profiles')
      .insert(row({ birth_utc: '1995-07-13T23:30:00Z' }));
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('refuses a city it does not know', async () => {
    const { error } = await vedat.client
      .from('profiles')
      .insert(row({ birth_city_id: 999_999_999 }));
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('accepts the instant the engine computes', async () => {
    // Istanbul, summer 1995: UTC+3, so 03:30 local is 00:30 UTC.
    const { error } = await vedat.client.from('profiles').insert(row({}));
    expect(error).toBeNull();
  });

  it('accepts both readings of an hour the clocks repeat', async () => {
    // 2000-10-29 01:30 in New York happened twice. The engine picks the
    // first, Postgres the second; neither is wrong. It has to be an
    // insert: birth columns cannot be updated at all, so an update-based
    // version of this test would pass without reaching the check. The
    // date is also old enough for the 18+ rule, which is checked first.
    const NEW_YORK = 5128581;
    for (const [tag, instant] of [
      ['first', '2000-10-29T05:30:00Z'],
      ['second', '2000-10-29T06:30:00Z'],
    ] as const) {
      const reader = await user(`ambiguous-${tag}`);
      const { error } = await reader.client.from('profiles').insert({
        ...profileRow({
          id: reader.id,
          display_name: 'Belirsiz',
          gender: 'man',
          interested_in: 'women',
          lonLat: ISTANBUL_NEARBY,
          photos: [],
        }),
        birth_city_id: NEW_YORK,
        birth_date: '2000-10-29',
        birth_local: '2000-10-29T01:30:00',
        birth_utc: instant,
      });
      expect(error, tag).toBeNull();
    }
  });

  it('accepts an offset the client rounds to the minute', async () => {
    // Monrovia ran at -00:44:30 until 1972 and the engine rounds that to
    // -00:44. Refusing it kept real people out of the app entirely.
    const MONROVIA = 2274895;
    const rounded = await user('rounded');
    const { error } = await rounded.client.from('profiles').insert({
      ...profileRow({
        id: rounded.id,
        display_name: 'Yuvarlak',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
        photos: [],
      }),
      birth_city_id: MONROVIA,
      birth_date: '1965-06-10',
      birth_local: '1965-06-10T09:00:00',
      birth_utc: '1965-06-10T09:44:00Z',
    });
    expect(error).toBeNull();
  });

  it('refuses an infinite birth date', async () => {
    // `-infinity` passed the 18+ rule and the agreement rule, and then
    // broke every reader: discover and match_profiles cast an age from
    // it, and Postgres cannot turn infinity into an integer. One such
    // profile blanked the deck for everyone whose radius reached it.
    const endless = await user('endless');
    const { error } = await endless.client.from('profiles').insert({
      ...profileRow({
        id: endless.id,
        display_name: 'Sonsuz',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
        photos: [],
      }),
      birth_date: '-infinity',
      birth_local: '-infinity',
      birth_utc: '-infinity',
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('refuses a chart the app could not read', async () => {
    // The other way to blank everyone's deck: the row parses as JSON but
    // not as a chart, and the client parses the deck as one array, so one
    // such profile turns the whole deck into an error for every viewer in
    // radius.
    const shapes: Record<string, unknown>[] = [
      { chart: { version: 1, planets: {}, houses: {} } },
      { big_three: {} },
      { big_three: { sun: 'aries', moon: 'aries', rising: 'yengeç' } },
    ];
    for (const shape of shapes) {
      const broken = await user('broken');
      const { error } = await broken.client.from('profiles').insert({
        ...profileRow({
          id: broken.id,
          display_name: 'Bozuk',
          gender: 'man',
          interested_in: 'women',
          lonLat: ISTANBUL_NEARBY,
          photos: [],
        }),
        ...shape,
      });
      expect(error?.code, JSON.stringify(shape)).toBe(CHECK_VIOLATION);
    }

    // Nothing was stored, so the neighbouring deck still answers.
    const neighbour = await alice.client.from('discover').select('id');
    expect(neighbour.error).toBeNull();
  });

  it('refuses a chart that is subtly unreadable', async () => {
    // These all parse as JSON and all fail the schema the app parses
    // with. `chart` is immutable after insert, so a stored one would
    // error on that member's own screen for ever, with account deletion
    // the only way out.
    const template = profileRow({
      id: alice.id,
      display_name: 'x',
      gender: 'man',
      interested_in: 'women',
      lonLat: ISTANBUL_NEARBY,
    });
    const sun = (placement: Json): Json => ({
      version: 1,
      planets: {
        ...(template.chart.planets as Record<string, Json>),
        sun: placement,
      },
      houses: template.chart.houses as Json,
    });
    const houses = (over: Json): Json => ({
      version: 1,
      planets: template.chart.planets as Json,
      houses: over,
    });

    const charts: Json[] = [
      sun({ longitude: 10, sign: 'aries' }),
      sun({ longitude: 10, sign: 'aries', degree: 10, house: 1 }),
      sun({
        longitude: 10,
        sign: 'aries',
        degree: 10,
        house: 77,
        retrograde: false,
      }),
      sun({
        longitude: 10,
        sign: 'aries',
        degree: 44,
        house: 1,
        retrograde: false,
      }),
      houses({ ascendant: -999, mc: 10, cusps: Array(12).fill(0) as Json }),
    ];
    for (const [index, broken] of charts.entries()) {
      const subtle = await user(`subtle-${index}`);
      const { error } = await subtle.client.from('profiles').insert({
        ...profileRow({
          id: subtle.id,
          display_name: 'İnce',
          gender: 'man',
          interested_in: 'women',
          lonLat: ISTANBUL_NEARBY,
          photos: [],
        }),
        chart: broken,
      });
      expect(error?.code, String(index)).toBe(CHECK_VIOLATION);
    }
  });

  it('refuses a degree that is only under 360 in decimal', async () => {
    // 359.99999999999999999 is under 360 as a decimal and exactly 360
    // once JSON.parse reads it, so the row would pass a numeric check and
    // then fail the client's. It cannot be written as a TypeScript
    // literal without losing the precision that is the whole point, so
    // the body goes over the wire as text.
    const crafted = await user('crafted');
    const row = {
      ...profileRow({
        id: crafted.id,
        display_name: 'Hassas',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
        photos: [],
      }),
    };
    const body = JSON.stringify(row).replace(
      /"ascendant":\s*[0-9.]+/,
      '"ascendant": 359.99999999999999999',
    );
    expect(body).toContain('359.99999999999999999');
    const response = await fetch(`${localStack().API_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: localStack().ANON_KEY,
        Authorization: `Bearer ${await accessToken(crafted)}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('profiles_chart_shape');
  });

  it('refuses a degree too small to be a double', async () => {
    // The cast raises for values under a double's range as well as over,
    // and the insert came back as a type error with the constraint's
    // internals in it rather than a refusal. Text again: `1e-400` is
    // simply `0` once TypeScript reads it.
    const tiny = await user('tiny');
    const row = profileRow({
      id: tiny.id,
      display_name: 'Küçük',
      gender: 'man',
      interested_in: 'women',
      lonLat: ISTANBUL_NEARBY,
      photos: [],
    });
    const body = JSON.stringify(row).replace(
      /"ascendant":\s*[0-9.]+/,
      '"ascendant": -1e-400',
    );
    expect(body).toContain('-1e-400');
    const response = await fetch(`${localStack().API_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: localStack().ANON_KEY,
        Authorization: `Bearer ${await accessToken(tiny)}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    expect(response.status).toBe(400);
    // The constraint, not a type error leaking the check's internals.
    expect(await response.text()).toContain('profiles_chart_shape');
  });

  it('lets the service role write a profile', async () => {
    // The shape helpers live in `private`, and a CHECK runs with the
    // writer's privileges: without a grant, every backend write to
    // profiles fails — the seed scripts, and anything server-side later.
    // The returned row is the point: an update that matches nothing
    // reports no error and evaluates no constraint, so it would pass this
    // test while the grant was missing.
    const { data, error } = await admin
      .from('profiles')
      .update({ radius_km: 75 })
      .eq('id', alice.id)
      .select('id, radius_km');
    try {
      expect(error).toBeNull();
      expect(data).toEqual([{ id: alice.id, radius_km: 75 }]);
    } finally {
      // Restore even on a failure, so this test leaves the row as it
      // found it — the same discipline as the radius test earlier in the
      // file, which does read alice's radius.
      await admin.from('profiles').update({ radius_km: 50 }).eq('id', alice.id);
    }
  });

  it('refuses a calendar date that disagrees with the wall clock', async () => {
    // The age gate reads birth_date and the chart reads birth_local;
    // nothing tied them together, so a client could be 36 on paper with a
    // twelve-year-old's chart.
    const mismatched = await user('mismatched');
    const { error } = await mismatched.client.from('profiles').insert({
      ...profileRow({
        id: mismatched.id,
        display_name: 'Uyumsuz',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
        photos: [],
      }),
      birth_date: '1990-01-01',
      birth_local: '1998-07-14T03:30:00',
      birth_utc: '1998-07-14T00:30:00Z',
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('hands out the instant it will accept', async () => {
    // The client asks rather than computing, so the two never disagree.
    const asker = await user('asker');
    const { data, error } = await asker.client.rpc('birth_instant', {
      city_id: 745044,
      local_time: '1995-07-14T03:30:00',
    });
    expect(error).toBeNull();
    expect(new Date(z.string().parse(data)).toISOString()).toBe(
      '1995-07-14T00:30:00.000Z',
    );

    const unknown = await asker.client.rpc('birth_instant', {
      city_id: 999_999_999,
      local_time: '1995-07-14T03:30:00',
    });
    expect(unknown.error?.code).toBe(CHECK_VIOLATION);
  });

  it('knows every city the app can offer', async () => {
    // The table is generated by hand from packages/geo. Add a city there
    // without regenerating and the app offers a birthplace the server
    // answers "unknown birth city" for — with the same generic error, for
    // everyone born there.
    const cities = allCities();
    const Rows = z.array(z.object({ id: z.number(), time_zone: z.string() }));
    const stored: z.infer<typeof Rows> = [];
    // PostgREST answers a thousand rows at a time.
    for (let from = 0; ; from += 1000) {
      const page = Rows.parse(
        (
          await admin
            .from('city_zones')
            .select('id, time_zone')
            .order('id')
            .range(from, from + 999)
        ).data ?? [],
      );
      stored.push(...page);
      if (page.length < 1000) break;
    }
    expect(stored.length).toBe(cities.length);
    const zones = new Map(stored.map((row) => [row.id, row.time_zone]));
    const wrong = cities.filter((c) => zones.get(c.id) !== c.timeZone);
    expect(wrong.map((c) => c.id)).toEqual([]);
  });

  it('is closed to anon, and so is the table behind it', async () => {
    const anon = anonClient();
    const called = await anon.rpc('birth_instant', {
      city_id: 745044,
      local_time: '1995-07-14T03:30:00',
    });
    expect(called.error).not.toBeNull();
    const read = await anon.from('city_zones').select('id').limit(1);
    expect(read.error).not.toBeNull();
  });
});

describe('metrics', () => {
  // Aggregates for the owner's dashboard. A view has no policies of its
  // own, so the grant is the whole boundary: if a member can read these,
  // they can count the people around them.
  const VIEWS = [
    'metrics_onboarding',
    'metrics_matches',
    'metrics_conversations',
    'metrics_reports',
  ] as const;

  it('are readable by nobody but the service role', async () => {
    for (const view of VIEWS) {
      const asMember = await alice.client.from(view).select('*');
      expect(asMember.error, view).not.toBeNull();
      const asAnon = await anonClient().from(view).select('*');
      expect(asAnon.error, view).not.toBeNull();
      const asOwner = await admin.from(view).select('*');
      expect(asOwner.error, view).toBeNull();
    }
  });

  it('count what the PRD asks about', async () => {
    const onboarding = z
      .array(
        z.object({
          accounts: z.number(),
          profiles: z.number(),
          completion_percent: z.number().nullable(),
        }),
      )
      .parse((await admin.from('metrics_onboarding').select('*')).data);
    expect(onboarding[0]?.accounts).toBeGreaterThan(0);
    expect(onboarding[0]?.profiles).toBeGreaterThan(0);

    const conversations = z
      .array(
        z.object({
          two_sided: z.number(),
          two_sided_three_each: z.number(),
          silent: z.number(),
        }),
      )
      .parse((await admin.from('metrics_conversations').select('*')).data);
    // The suite creates matches with a message or two, never three each.
    expect(conversations[0]?.two_sided_three_each).toBe(0);
  });
});

describe('consent', () => {
  // KVKK: a profile is where birth data and location start being
  // processed, so it cannot exist without a record of the notice having
  // been accepted, and the time of it is the server's to state.
  let umut: TestUser;

  beforeAll(async () => {
    umut = await user('umut');
  });

  it('refuses a profile with no accepted version', async () => {
    const complete = profileRow({
      id: umut.id,
      display_name: 'Umut',
      gender: 'man',
      interested_in: 'women',
      lonLat: ISTANBUL_NEARBY,
      photos: [],
    });
    const withoutConsent = Object.fromEntries(
      Object.entries(complete).filter(([key]) => key !== 'consent_version'),
    );
    const { error } = await umut.client
      .from('profiles')
      // @ts-expect-error why: this is exactly the payload the generated
      // types forbid — a client that never sends the column. The server
      // has to refuse it on its own.
      .insert(withoutConsent);
    expect(error?.code).toBe(NOT_NULL_VIOLATION);
  });

  it('refuses a version that is not a date', async () => {
    const { error } = await umut.client.from('profiles').insert({
      ...profileRow({
        id: umut.id,
        display_name: 'Umut',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
        photos: [],
      }),
      consent_version: 'kabul',
    });
    // The column is a date, so the type refuses it before any CHECK does.
    expect(error?.code).toBe(INVALID_DATE);
  });

  it('refuses a version that is not a real date', async () => {
    // A regex over text accepted 9999-99-99, which would also compare as
    // newer than every real version for ever.
    for (const version of ['9999-99-99', '0000-00-00', '2999-01-01']) {
      const { error } = await umut.client.from('profiles').insert({
        ...profileRow({
          id: umut.id,
          display_name: 'Umut',
          gender: 'man',
          interested_in: 'women',
          lonLat: ISTANBUL_NEARBY,
          photos: [],
        }),
        consent_version: version,
      });
      expect(error, version).not.toBeNull();
    }
  });

  it('will not let a client write the timestamp at all', async () => {
    const backdated = '2001-01-01T00:00:00Z';
    const { error } = await umut.client.from('profiles').insert({
      ...profileRow({
        id: umut.id,
        display_name: 'Umut',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
        photos: [],
      }),
      consent_at: backdated,
    });
    expect(error).toBeNull();

    const stored = await umut.client
      .from('profiles')
      .select('consent_at, consent_version')
      .eq('id', umut.id)
      .single();
    const row = z
      .object({ consent_at: z.string(), consent_version: z.string() })
      .parse(stored.data);
    expect(row.consent_version).toBe('2026-09-09');
    expect(Date.parse(row.consent_at)).toBeGreaterThan(Date.parse(backdated));

    // The stamping trigger only fires on an update that names the
    // version, so the column itself is taken away from clients: without
    // that, one REST call sets the KVKK timestamp to anything.
    const first = Date.parse(row.consent_at);
    const forged = await umut.client
      .from('profiles')
      .update({ consent_at: backdated })
      .eq('id', umut.id);
    expect(forged.error?.code).toBe(PERMISSION_DENIED);

    // The version cannot be walked backwards either: the stamp was
    // already the server's, and a version naming a text that was never
    // shown is the same claim by another route.
    const older = await umut.client
      .from('profiles')
      .update({ consent_version: '2020-01-01' })
      .eq('id', umut.id);
    expect(older.error?.code).toBe(CHECK_VIOLATION);

    // Re-accepting a newer notice moves the stamp forward, and only the
    // server decides where to.
    const again = await umut.client
      .from('profiles')
      .update({ consent_version: '2026-09-09' })
      .eq('id', umut.id);
    expect(again.error).toBeNull();
    const after = await umut.client
      .from('profiles')
      .select('consent_at')
      .eq('id', umut.id)
      .single();
    const stamp = z.object({ consent_at: z.string() }).parse(after.data);
    expect(Date.parse(stamp.consent_at)).toBeGreaterThanOrEqual(first);
  });
});

describe('photos', () => {
  let sema: TestUser; // has a photo
  let tolga: TestUser; // starts without one
  const shot = () =>
    new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });

  beforeAll(async () => {
    sema = await user('sema');
    tolga = await user('tolga');
    await insertProfile(
      sema,
      profileRow({
        id: sema.id,
        display_name: 'Sema',
        gender: 'woman',
        interested_in: 'men',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
    await insertProfile(
      tolga,
      profileRow({
        id: tolga.id,
        display_name: 'Tolga',
        gender: 'man',
        interested_in: 'women',
        lonLat: ISTANBUL_NEARBY,
        photos: [],
      }),
    );
  });

  it('a profile without a photo is shown to nobody', async () => {
    expect(
      ids((await sema.client.from('discover').select('id')).data),
    ).not.toContain(tolga.id);

    await uploadPhotos(tolga.client, [`${tolga.id}/1.png`]);
    const { error } = await tolga.client
      .from('profiles')
      .update({ photos: [`${tolga.id}/1.png`] })
      .eq('id', tolga.id);
    expect(error).toBeNull();
    expect(
      ids((await sema.client.from('discover').select('id')).data),
    ).toContain(tolga.id);
  });

  it('a photo list cannot point at someone else folder', async () => {
    const { error } = await tolga.client
      .from('profiles')
      .update({ photos: [`${sema.id}/1.png`] })
      .eq('id', tolga.id);
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('at most six photos', async () => {
    const seven = Array.from({ length: 7 }, (_, i) => `${tolga.id}/${i}.png`);
    const { error } = await tolga.client
      .from('profiles')
      .update({ photos: seven })
      .eq('id', tolga.id);
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('uploads land in your own folder and nowhere else', async () => {
    const own = await sema.client.storage
      .from('photos')
      .upload(`${sema.id}/own.png`, shot(), { contentType: 'image/png' });
    expect(own.error).toBeNull();

    const theirs = await sema.client.storage
      .from('photos')
      .upload(`${tolga.id}/sneaky.png`, shot(), { contentType: 'image/png' });
    expect(theirs.error).not.toBeNull();

    const outside = await sema.client.storage
      .from('photos')
      .upload('loose.png', shot(), { contentType: 'image/png' });
    expect(outside.error).not.toBeNull();
  });

  it('another member can sign a URL until a block', async () => {
    const path = `${sema.id}/own.png`;
    const before = await tolga.client.storage
      .from('photos')
      .createSignedUrl(path, 60);
    expect(before.error).toBeNull();
    expect(before.data?.signedUrl).toContain('/photos/');

    const blocked = await sema.client
      .from('blocks')
      .insert({ blocker_id: sema.id, blocked_id: tolga.id });
    expect(blocked.error).toBeNull();

    const after = await tolga.client.storage
      .from('photos')
      .createSignedUrl(path, 60);
    expect(after.error).not.toBeNull();

    await sema.client
      .from('blocks')
      .delete()
      .eq('blocker_id', sema.id)
      .eq('blocked_id', tolga.id);
  });

  it('a photo path with no object behind it is refused', async () => {
    // Otherwise the discover gate counts strings, and an empty profile with
    // one invented path appears in every nearby deck.
    const { error } = await tolga.client
      .from('profiles')
      .update({ photos: [`${tolga.id}/invented.png`] })
      .eq('id', tolga.id);
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('nothing can nest below the owner folder', async () => {
    // Account deletion walks the folder; a nested object used to outlive
    // the account it belonged to, and the folder row it produced could not
    // be removed at all. Upload is the obvious way in — move is the one a
    // review found open.
    const nested = await sema.client.storage
      .from('photos')
      .upload(`${sema.id}/deep/x.png`, shot(), { contentType: 'image/png' });
    expect(nested.error).not.toBeNull();

    const flat = `${sema.id}/movable.png`;
    const uploaded = await sema.client.storage
      .from('photos')
      .upload(flat, shot(), { contentType: 'image/png' });
    expect(uploaded.error).toBeNull();
    const moved = await sema.client.storage
      .from('photos')
      .move(flat, `${sema.id}/deep/hidden.png`);
    expect(moved.error).not.toBeNull();
    const copied = await sema.client.storage
      .from('photos')
      .copy(flat, `${sema.id}/deep/copy.png`);
    expect(copied.error).not.toBeNull();
    await sema.client.storage.from('photos').remove([flat]);
  });

  it('deleting the object takes the path out of the profile', async () => {
    // The list is checked when it is written; without this trigger a
    // profile could keep a path to an object it had just deleted, and stay
    // in every nearby deck with a blank card.
    const path = `${tolga.id}/gate.png`;
    const uploaded = await tolga.client.storage
      .from('photos')
      .upload(path, shot(), { contentType: 'image/png' });
    expect(uploaded.error).toBeNull();
    const saved = await tolga.client
      .from('profiles')
      .update({ photos: [path] })
      .eq('id', tolga.id);
    expect(saved.error).toBeNull();
    expect(
      ids((await sema.client.from('discover').select('id')).data),
    ).toContain(tolga.id);

    await tolga.client.storage.from('photos').remove([path]);

    const after = await tolga.client
      .from('profiles')
      .select('photos')
      .eq('id', tolga.id)
      .single();
    expect(z.object({ photos: z.array(z.string()) }).parse(after.data)).toEqual(
      { photos: [] },
    );
    expect(
      ids((await sema.client.from('discover').select('id')).data),
    ).not.toContain(tolga.id);
  });

  it('an object in a non-uuid folder can still be deleted', async () => {
    // Only the service role can make one, but the prune trigger casts the
    // folder name to uuid: unguarded, that object could never be removed
    // again, through any client.
    const path = 'not-a-uuid/stray.png';
    const uploaded = await admin.storage
      .from('photos')
      .upload(path, shot(), { contentType: 'image/png', upsert: true });
    expect(uploaded.error).toBeNull();
    const removed = await admin.storage.from('photos').remove([path]);
    expect(removed.error).toBeNull();
    expect(removed.data?.length).toBe(1);
  });

  it('a folder cannot grow past the deletable limit', async () => {
    // An account whose folder cannot be emptied in one invocation cannot
    // be deleted, so the folder is capped. The account under test has no
    // profile row: nothing requires one before uploading, and the first
    // version of this cap skipped exactly that case — which is the
    // account most likely to be filled on purpose.
    const stranger = await user('stranger');
    const paths = Array.from(
      { length: 240 },
      (_, i) => `${stranger.id}/cap-${i}.png`,
    );
    const uploads = await Promise.all(
      paths.map((path) =>
        stranger.client.storage
          .from('photos')
          .upload(path, shot(), { contentType: 'image/png' }),
      ),
    );
    // Some refusals must be the cap itself, not transport noise.
    const refusals = uploads
      .map((u) => u.error?.message ?? '')
      .filter((message) => message.includes('database error'));
    expect(refusals.length).toBeGreaterThan(0);
    const left = await admin.storage
      .from('photos')
      .list(stranger.id, { limit: 400 });
    expect(left.data?.length ?? 0).toBeLessThanOrEqual(200);

    // At the cap, replacing an object in place still works: it does not
    // grow the folder, and refusing it would leave a full folder with no
    // way back — the client sweeps orphans only after a successful write.
    const existing = left.data?.[0]?.name;
    expect(existing).toBeDefined();
    const replaced = await stranger.client.storage
      .from('photos')
      .upload(`${stranger.id}/${existing ?? ''}`, shot(), {
        contentType: 'image/png',
        upsert: true,
      });
    expect(replaced.error).toBeNull();

    await stranger.client.storage.from('photos').remove(paths);
  }, 120_000);

  it('a photo cannot be carried into another bucket either', async () => {
    // The rename guard used to test only the destination bucket, so
    // moving an object *out* of photos fired no delete and left the path
    // in the profile with nothing behind it.
    const other = `probe-${Date.now()}`;
    const made = await admin.storage.createBucket(other, { public: false });
    expect(made.error).toBeNull();
    const path = `${sema.id}/carry.png`;
    const uploaded = await admin.storage
      .from('photos')
      .upload(path, shot(), { contentType: 'image/png', upsert: true });
    expect(uploaded.error).toBeNull();

    const carried = await admin.storage
      .from('photos')
      .move(path, path, { destinationBucket: other });
    expect(carried.error).not.toBeNull();
    const still = await admin.storage
      .from('photos')
      .list(sema.id, { limit: 200 });
    expect(still.data?.some((f) => f.name === 'carry.png')).toBe(true);

    await admin.storage.from('photos').remove([path]);
    await admin.storage.deleteBucket(other);
  });

  it('a photo cannot be renamed out from under the profile', async () => {
    // A move fires no delete, so the prune trigger never runs and the old
    // path stays in profiles.photos with nothing behind it — enough to
    // keep a profile in every nearby deck for ever.
    const path = `${sema.id}/rename-me.png`;
    const uploaded = await sema.client.storage
      .from('photos')
      .upload(path, shot(), { contentType: 'image/png' });
    expect(uploaded.error).toBeNull();
    const moved = await sema.client.storage
      .from('photos')
      .move(path, `${sema.id}/renamed.png`);
    // The trigger, not a missing object: assert what refused it.
    expect(moved.error?.message).toContain('database error');
    // The original is still there, so nothing was stranded either way.
    const still = await sema.client.storage
      .from('photos')
      .list(sema.id, { limit: 200 });
    expect(still.data?.some((f) => f.name === 'rename-me.png')).toBe(true);
    await sema.client.storage.from('photos').remove([path]);
  });

  it('nobody can delete someone else photo', async () => {
    const { data, error } = await tolga.client.storage
      .from('photos')
      .remove([`${sema.id}/own.png`]);
    // Storage answers a refused delete with an empty result, not an error.
    if (error) expect(error).not.toBeNull();
    else expect(data).toEqual([]);
    const still = await sema.client.storage
      .from('photos')
      .createSignedUrl(`${sema.id}/own.png`, 60);
    expect(still.error).toBeNull();
  });
});
