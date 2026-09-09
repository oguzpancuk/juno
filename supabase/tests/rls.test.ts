import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
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
const CHECK_VIOLATION = '23514';

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

  const MessageRows = z.array(
    z
      .object({
        id: z.string().uuid(),
        match_id: z.string().uuid(),
        sender_id: z.string().uuid(),
        body: z.string(),
        read_at: z.string().nullable(),
        created_at: z.string(),
      })
      .strict(),
  );

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
    expect(uploads.filter((u) => u.error !== null).length).toBeGreaterThan(0);
    const left = await admin.storage
      .from('photos')
      .list(stranger.id, { limit: 400 });
    expect(left.data?.length ?? 0).toBeLessThanOrEqual(200);
    await stranger.client.storage.from('photos').remove(paths);
  }, 120_000);

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
    expect(moved.error).not.toBeNull();
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
