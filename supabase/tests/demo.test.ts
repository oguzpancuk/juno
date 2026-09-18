import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ISTANBUL,
  ISTANBUL_NEARBY,
  STARTER,
  insertProfileRow,
  profileRow,
  uploadPhotos,
} from './fixtures';
import { adminClient, createUser, deleteUsers, type TestUser } from './local';

const admin = adminClient();

const MatchRows = z.array(
  z.object({
    a: z.string().uuid(),
    b: z.string().uuid(),
    starter_key: z.string(),
  }),
);
const LikeRows = z.array(
  z.object({
    from_id: z.string().uuid(),
    to_id: z.string().uuid(),
    kind: z.string(),
    starter_key: z.string().nullable(),
  }),
);

/**
 * The launch demos: twenty accounts that carry no badge and whose only
 * difference is that liking one matches immediately.
 *
 * Not "indistinguishable", which is what an earlier draft of this comment
 * claimed. The immediacy is itself the tell — a like on a member waits for
 * them and a like on a demo does not — so one swipe separates the two, and
 * no column discipline can take that back. What the tests below hold is
 * narrower and true: the flag reaches no client, and no member can give it
 * to themselves.
 *
 * What the owner asked for (2026-09-17) was "every demo likes the new
 * member, and a like back matches". The migration builds the second half
 * and lets it produce the first.
 */
describe('demo profiles', () => {
  let member: TestUser;
  let demo: TestUser;
  let plain: TestUser;

  beforeAll(async () => {
    member = await createUser(admin, 'demo-member');
    demo = await createUser(admin, 'demo-account');
    plain = await createUser(admin, 'demo-plain');

    await insertProfileRow(
      member.client,
      profileRow({
        id: member.id,
        display_name: 'Member',
        gender: 'woman',
        interested_in: 'everyone',
        lonLat: ISTANBUL,
      }),
    );
    // The demo's own row is written the way the seeding script writes it:
    // as the service role, with the flag set.
    await uploadPhotos(demo.client, [`${demo.id}/1.png`]);
    const demoRow = {
      ...profileRow({
        id: demo.id,
        display_name: 'Demo',
        gender: 'man',
        interested_in: 'everyone',
        lonLat: ISTANBUL_NEARBY,
      }),
      is_demo: true,
    };
    const { error } = await admin.from('profiles').insert(demoRow);
    if (error) throw new Error(`insert demo profile: ${error.message}`);

    await insertProfileRow(
      plain.client,
      profileRow({
        id: plain.id,
        display_name: 'Plain',
        gender: 'man',
        interested_in: 'everyone',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
  });

  afterAll(async () => {
    await deleteUsers(admin, [member, demo, plain]);
  });

  it('a like on a demo matches at once, with the liker’s own key', async () => {
    const liked = await member.client.from('likes').insert({
      from_id: member.id,
      to_id: demo.id,
      kind: 'like',
      starter_key: STARTER,
    });
    expect(liked.error).toBeNull();

    const matches = MatchRows.parse(
      (await member.client.from('matches').select('a, b, starter_key')).data,
    );
    expect(matches).toHaveLength(1);
    const [lo, hi] =
      member.id < demo.id ? [member.id, demo.id] : [demo.id, member.id];
    expect(matches[0]).toEqual({ a: lo, b: hi, starter_key: STARTER });

    // The demo's answering like exists and carries the same key — which is
    // why `create_match_on_mutual_like`, which refuses a disagreeing pair,
    // let it through.
    const reciprocal = LikeRows.parse(
      (
        await admin
          .from('likes')
          .select('from_id, to_id, kind, starter_key')
          .eq('from_id', demo.id)
          .eq('to_id', member.id)
      ).data,
    );
    expect(reciprocal).toEqual([
      {
        from_id: demo.id,
        to_id: member.id,
        kind: 'like',
        starter_key: STARTER,
      },
    ]);
  });

  it('a pass on a demo is still a pass', async () => {
    const passed = await member.client.from('likes').insert({
      from_id: member.id,
      to_id: plain.id,
      kind: 'pass',
    });
    expect(passed.error).toBeNull();
    const reciprocal = LikeRows.parse(
      (
        await admin
          .from('likes')
          .select('from_id, to_id, kind, starter_key')
          .eq('from_id', plain.id)
      ).data,
    );
    expect(reciprocal).toEqual([]);
  });

  it('a like on an ordinary profile still waits for the other side', async () => {
    const waiting = await createUser(admin, 'demo-waiting');
    try {
      await insertProfileRow(
        waiting.client,
        profileRow({
          id: waiting.id,
          display_name: 'Waiting',
          gender: 'man',
          interested_in: 'everyone',
          lonLat: ISTANBUL_NEARBY,
        }),
      );
      const liked = await member.client.from('likes').insert({
        from_id: member.id,
        to_id: waiting.id,
        kind: 'like',
        starter_key: STARTER,
      });
      expect(liked.error).toBeNull();
      const pairs = MatchRows.parse(
        (
          await admin
            .from('matches')
            .select('a, b, starter_key')
            .or(`a.eq.${waiting.id},b.eq.${waiting.id}`)
        ).data,
      );
      expect(pairs).toEqual([]);
    } finally {
      await deleteUsers(admin, [waiting]);
    }
  });

  it('a member cannot make themselves a demo', async () => {
    const cheat = await createUser(admin, 'demo-cheat');
    try {
      await uploadPhotos(cheat.client, [`${cheat.id}/1.png`]);
      // The insert is not refused — it is quietly disarmed, because
      // refusing it would break onboarding for a client that sent the
      // column by accident.
      const { error } = await cheat.client.from('profiles').insert({
        ...profileRow({
          id: cheat.id,
          display_name: 'Cheat',
          gender: 'man',
          interested_in: 'everyone',
          lonLat: ISTANBUL_NEARBY,
        }),
        is_demo: true,
      });
      expect(error).toBeNull();

      const stored = z
        .array(z.object({ is_demo: z.boolean() }))
        .parse(
          (await admin.from('profiles').select('is_demo').eq('id', cheat.id))
            .data,
        );
      expect(stored).toEqual([{ is_demo: false }]);

      // And an update is refused outright: the column is not in the
      // member's update grant, so PostgREST answers 42501.
      const updated = await cheat.client
        .from('profiles')
        .update({ is_demo: true })
        .eq('id', cheat.id);
      expect(updated.error).not.toBeNull();
    } finally {
      await deleteUsers(admin, [cheat]);
    }
  });

  it('the flag never reaches a client', async () => {
    // A viewer of their own, who has swiped on nobody: `member` has been
    // through every other profile in this file by now, and `discover`
    // hides what you have already answered — an empty deck would let this
    // pass without ever having looked at a demo's row.
    const viewer = await createUser(admin, 'demo-viewer');
    try {
      await insertProfileRow(
        viewer.client,
        profileRow({
          id: viewer.id,
          display_name: 'Viewer',
          gender: 'woman',
          interested_in: 'everyone',
          lonLat: ISTANBUL,
        }),
      );
      const rows = z
        .array(z.record(z.unknown()))
        .parse((await viewer.client.from('discover').select('*')).data);
      expect(rows.map((row) => row['id'])).toContain(demo.id);
      for (const row of rows) expect(row).not.toHaveProperty('is_demo');

      // And on the other side of a match: `member` matched the demo in
      // the first test, so this list is not empty either.
      const matched = z
        .array(z.record(z.unknown()))
        .parse((await member.client.from('match_profiles').select('*')).data);
      expect(matched.map((row) => row['id'])).toContain(demo.id);
      for (const row of matched) expect(row).not.toHaveProperty('is_demo');
    } finally {
      await deleteUsers(admin, [viewer]);
    }
  });
});
