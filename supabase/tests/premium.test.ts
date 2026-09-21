import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ISTANBUL,
  ISTANBUL_NEARBY,
  STARTER,
  insertProfileRow,
  profileRow,
} from './fixtures';
import {
  adminClient,
  anonClient,
  createUser,
  deleteUsers,
  localStack,
  type Client,
  type TestUser,
} from './local';

/**
 * Premium membership: the quotas the database enforces and the list the
 * `liked_me` view withholds.
 *
 * What the app does with all this — the counter under the deck, the star
 * button, the order of the cards — is driven by
 * `apps/mobile/lib/premium.test.ts`. These are the rules themselves,
 * which are the only part of the membership a client cannot talk its way
 * past: the flag is self-granted while there is no payment step, so a
 * quota that lived in the app would be a suggestion.
 */
const admin = adminClient();

/** The migration's numbers. Both sides are pinned; change one, change both. */
const FREE_DAILY_LIKES = 20;
const SUPER_LIKES_PER_WEEK = 5;

const CHECK_VIOLATION = '23514';
const PERMISSION_DENIED = '42501';

let mia: TestUser; // free member
let nil: TestUser; // premium member
let eve: TestUser; // free member, untouched by the quota tests
let ada: TestUser; // likes mia and nil
let zoe: TestUser; // premium; super likes mia and nil
let lil: TestUser; // free; one of the people she likes blocks her
let pia: TestUser; // free; spends her last likes all at once

const users: TestUser[] = [];

/** Profiles that only exist to be liked: no photographs, no session. */
interface Target {
  readonly id: string;
}
const targets: Target[] = [];
/** mia's twenty-one, and nil's: the same rows, a different liker. */
const DAILY_POOL = FREE_DAILY_LIKES + 1;
/** nil's stars need people nil has not liked yet. */
const SUPER_POOL = SUPER_LIKES_PER_WEEK + 1;

async function user(tag: string): Promise<TestUser> {
  const created = await createUser(admin, tag);
  users.push(created); // pushed at once so cleanup covers a partial setup
  return created;
}

/**
 * A profile with no photographs, written with the service role: these
 * rows are the other end of a like and nothing else, and a storage
 * object each would be the slowest part of this file.
 */
async function target(index: number): Promise<Target> {
  const created = await user(`target-${index}`);
  const { error } = await admin.from('profiles').insert(
    profileRow({
      id: created.id,
      display_name: `Target ${index}`,
      gender: 'man',
      interested_in: 'women',
      lonLat: ISTANBUL_NEARBY,
      photos: [],
    }),
  );
  if (error) throw new Error(`insert target ${index}: ${error.message}`);
  return { id: created.id };
}

/** The nth target's id; a missing one is a broken fixture, not a null. */
function targetId(index: number): string {
  const found = targets[index];
  if (!found) throw new Error(`no target ${index} — setup did not finish`);
  return found.id;
}

async function like(
  client: Client,
  from: string,
  to: string,
  options: { super?: boolean; created_at?: string } = {},
) {
  return client.from('likes').insert({
    from_id: from,
    to_id: to,
    kind: 'like',
    starter_key: STARTER,
    ...(options.super === undefined ? {} : { is_super: options.super }),
    ...(options.created_at === undefined
      ? {}
      : { created_at: options.created_at }),
  });
}

async function setPremium(who: TestUser, premium: boolean) {
  const { error } = await who.client
    .from('profiles')
    .update({ is_premium: premium })
    .eq('id', who.id);
  if (error) throw new Error(`premium for ${who.email}: ${error.message}`);
}

const ProfileRows = z.array(
  z.object({
    is_premium: z.boolean(),
    premium_since: z.string().nullable(),
    sort_by: z.string(),
  }),
);

const LikedMeRows = z.array(
  z
    .object({
      id: z.string().uuid().nullable(),
      display_name: z.string().nullable(),
      age: z.number().int().nullable(),
      gender: z.string().nullable(),
      big_three: z.record(z.string()).nullable(),
      chart: z.record(z.unknown()).nullable(),
      bio: z.string().nullable(),
      photos: z.array(z.string()).nullable(),
      is_super: z.boolean(),
      liked_at: z.string(),
    })
    // strict: a column the view should never carry fails the parse
    .strict(),
);

beforeAll(async () => {
  localStack();
  mia = await user('mia');
  nil = await user('nil');
  eve = await user('eve');
  ada = await user('ada');
  zoe = await user('zoe');
  lil = await user('lil');
  pia = await user('pia');
  for (const [who, name] of [
    [mia, 'Mia'],
    [nil, 'Nil'],
    [eve, 'Eve'],
    [lil, 'Lil'],
    [pia, 'Pia'],
  ] as const) {
    await insertProfileRow(
      who.client,
      profileRow({
        id: who.id,
        display_name: name,
        gender: 'woman',
        interested_in: 'everyone',
        lonLat: ISTANBUL,
      }),
    );
  }
  for (const [who, name] of [
    [ada, 'Ada'],
    [zoe, 'Zoe'],
  ] as const) {
    await insertProfileRow(
      who.client,
      profileRow({
        id: who.id,
        display_name: name,
        gender: 'woman',
        interested_in: 'everyone',
        lonLat: ISTANBUL_NEARBY,
      }),
    );
  }
  await setPremium(nil, true);
  await setPremium(zoe, true);
  // Sequential on purpose: the admin API is happier with one call at a
  // time than with thirty in flight, and this whole file runs once.
  for (let index = 0; index < DAILY_POOL + SUPER_POOL; index++) {
    targets.push(await target(index));
  }
}, 120_000);

afterAll(async () => {
  await deleteUsers(admin, users);
}, 120_000);

describe('the daily like quota', () => {
  it(`lets a free member spend ${FREE_DAILY_LIKES} likes and refuses the next`, async () => {
    for (let index = 0; index < FREE_DAILY_LIKES; index++) {
      const spent = await like(mia.client, mia.id, targetId(index));
      expect(spent.error, `like ${index + 1}`).toBeNull();
    }
    const over = await like(mia.client, mia.id, targetId(FREE_DAILY_LIKES));
    expect(over.error?.code).toBe(CHECK_VIOLATION);
    // The message is the app's discriminator (lib/premium-rules.ts).
    expect(over.error?.message).toContain('daily like quota spent');
  }, 60_000);

  it('does not count a pass against it', async () => {
    // eve has spent nothing; a pass must leave it that way, so the like
    // after it is still allowed.
    const passed = await eve.client.from('likes').insert({
      from_id: eve.id,
      to_id: targetId(0),
      kind: 'pass',
      starter_key: null,
    });
    expect(passed.error).toBeNull();
    const liked = await like(eve.client, eve.id, targetId(1));
    expect(liked.error).toBeNull();
  });

  it('does not apply to a premium member', async () => {
    for (let index = 0; index < DAILY_POOL; index++) {
      const spent = await like(nil.client, nil.id, targetId(index));
      expect(spent.error, `like ${index + 1}`).toBeNull();
    }
  }, 60_000);

  it('counts from the server’s clock, not the client’s', async () => {
    // Dating a like out of the window is how a client would spend an
    // unlimited day; the trigger overwrites `created_at` with now().
    const backdated = await like(eve.client, eve.id, targetId(2), {
      created_at: '2020-01-01T00:00:00Z',
    });
    expect(backdated.error).toBeNull();
    const { data } = await eve.client
      .from('likes')
      .select('created_at')
      .eq('from_id', eve.id)
      .eq('to_id', targetId(2))
      .single();
    const stored = z.object({ created_at: z.string() }).parse(data);
    const age = Date.now() - new Date(stored.created_at).getTime();
    expect(age).toBeLessThan(5 * 60_000);
  });

  it('counts a like the liker can no longer read', async () => {
    // `likes: read own open` (20260909000002_safety.sql) hides a like
    // sent to somebody who has since blocked the liker. The quota must
    // not be counted through that policy, or the cap is the cap plus
    // however many people have blocked you.
    for (let index = 0; index < FREE_DAILY_LIKES; index++) {
      const spent = await like(lil.client, lil.id, targetId(index));
      expect(spent.error, `like ${index + 1}`).toBeNull();
    }
    const blocked = await admin
      .from('blocks')
      .insert({ blocker_id: targetId(0), blocked_id: lil.id });
    expect(blocked.error).toBeNull();
    // The policy really does hide one of them: nineteen readable, twenty
    // spent. Without this line the test would pass on a policy change
    // rather than on the counting.
    const mine = await lil.client
      .from('likes')
      .select('to_id', { count: 'exact', head: true })
      .eq('from_id', lil.id);
    expect(mine.count).toBe(FREE_DAILY_LIKES - 1);

    const over = await like(lil.client, lil.id, targetId(FREE_DAILY_LIKES));
    expect(over.error?.code).toBe(CHECK_VIOLATION);
    expect(over.error?.message).toContain('daily like quota spent');
  }, 60_000);

  it('holds when the last likes are spent all at once', async () => {
    // Counting alone is not a limit: without the advisory lock every
    // overlapping insert reads the same `spent` from before the others
    // committed, and they all pass. One like short of the cap, five at
    // once, and exactly one of them may land.
    const AT_ONCE = 5;
    for (let index = 0; index < FREE_DAILY_LIKES - 1; index++) {
      const spent = await like(pia.client, pia.id, targetId(index));
      expect(spent.error, `like ${index + 1}`).toBeNull();
    }
    const together = await Promise.all(
      Array.from({ length: AT_ONCE }, (_, n) =>
        like(pia.client, pia.id, targetId(FREE_DAILY_LIKES - 1 + n)),
      ),
    );
    const stored = together.filter((one) => one.error === null);
    const refused = together.filter(
      (one) => one.error?.code === CHECK_VIOLATION,
    );
    expect(stored).toHaveLength(1);
    expect(refused).toHaveLength(AT_ONCE - 1);

    const mine = await pia.client
      .from('likes')
      .select('to_id', { count: 'exact', head: true })
      .eq('from_id', pia.id);
    expect(mine.count).toBe(FREE_DAILY_LIKES);
  }, 60_000);
});

describe('super likes', () => {
  it('are refused to a free member', async () => {
    const starred = await like(eve.client, eve.id, targetId(3), {
      super: true,
    });
    expect(starred.error?.code).toBe(CHECK_VIOLATION);
    expect(starred.error?.message).toContain('super like needs premium');
  });

  it('cannot be a pass', async () => {
    const starred = await nil.client.from('likes').insert({
      from_id: nil.id,
      to_id: targetId(DAILY_POOL),
      kind: 'pass',
      starter_key: null,
      is_super: true,
    });
    expect(starred.error?.code).toBe(CHECK_VIOLATION);
    expect(starred.error?.message).toContain('likes_super_is_a_like');
  });

  it(`give a premium member ${SUPER_LIKES_PER_WEEK} a week and no more`, async () => {
    for (let index = 0; index < SUPER_LIKES_PER_WEEK; index++) {
      const starred = await like(
        nil.client,
        nil.id,
        targetId(DAILY_POOL + index),
        { super: true },
      );
      expect(starred.error, `star ${index + 1}`).toBeNull();
    }
    const over = await like(
      nil.client,
      nil.id,
      targetId(DAILY_POOL + SUPER_LIKES_PER_WEEK),
      { super: true },
    );
    expect(over.error?.code).toBe(CHECK_VIOLATION);
    expect(over.error?.message).toContain('super like quota spent');
  }, 60_000);

  it('leaves the plain likes of a premium member alone', async () => {
    // The star quota is its own: spending it must not close the likes,
    // which have no cap for a premium member at all.
    const plain = await like(
      nil.client,
      nil.id,
      targetId(DAILY_POOL + SUPER_LIKES_PER_WEEK),
    );
    expect(plain.error).toBeNull();
  });
});

describe('the premium flag', () => {
  it('is stamped and cleared by the server, never by the client', async () => {
    await setPremium(eve, true);
    const { data: on } = await eve.client
      .from('profiles')
      .select('is_premium, premium_since, sort_by')
      .eq('id', eve.id);
    const [premium] = ProfileRows.parse(on);
    expect(premium?.is_premium).toBe(true);
    expect(premium?.premium_since).not.toBeNull();
    await setPremium(eve, false);
    const { data: off } = await eve.client
      .from('profiles')
      .select('is_premium, premium_since, sort_by')
      .eq('id', eve.id);
    const [free] = ProfileRows.parse(off);
    expect(free?.premium_since).toBeNull();
  });

  it('refuses a client that writes premium_since itself', async () => {
    const { error } = await eve.client
      .from('profiles')
      .update({ premium_since: new Date().toISOString() })
      .eq('id', eve.id);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('cannot be set on somebody else', async () => {
    const { error } = await mia.client
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', eve.id);
    // RLS makes it a no-op rather than an error: the update matches no
    // row the caller may write.
    expect(error).toBeNull();
    const { data } = await admin
      .from('profiles')
      .select('is_premium, premium_since, sort_by')
      .eq('id', eve.id);
    const [row] = ProfileRows.parse(data);
    expect(row?.is_premium).toBe(false);
  });

  it('keeps sort_by inside its two values', async () => {
    const ok = await eve.client
      .from('profiles')
      .update({ sort_by: 'compatibility' })
      .eq('id', eve.id);
    expect(ok.error).toBeNull();
    const nonsense = await eve.client
      .from('profiles')
      .update({ sort_by: 'whatever' })
      .eq('id', eve.id);
    expect(nonsense.error?.code).toBe(CHECK_VIOLATION);
  });
});

describe('liked_me', () => {
  beforeAll(async () => {
    // ada likes both; zoe, who is premium, stars both.
    for (const target of [mia, nil]) {
      const plain = await like(ada.client, ada.id, target.id);
      expect(plain.error).toBeNull();
      const starred = await like(zoe.client, zoe.id, target.id, {
        super: true,
      });
      expect(starred.error).toBeNull();
    }
  }, 30_000);

  it('gives a free member the count and nothing that says who', async () => {
    const { data, error } = await mia.client.from('liked_me').select('*');
    expect(error).toBeNull();
    const rows = LikedMeRows.parse(data);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.id).toBeNull();
      expect(row.display_name).toBeNull();
      expect(row.age).toBeNull();
      expect(row.gender).toBeNull();
      expect(row.big_three).toBeNull();
      expect(row.chart).toBeNull();
      expect(row.photos).toBeNull();
    }
    // What the upsell is made of: one of the two pressed the star, and
    // both carry the day they arrived.
    expect(rows.filter((row) => row.is_super)).toHaveLength(1);
    expect(rows.every((row) => row.liked_at.length > 0)).toBe(true);
  });

  it('gives a premium member the people', async () => {
    const { data, error } = await nil.client.from('liked_me').select('*');
    expect(error).toBeNull();
    const rows = LikedMeRows.parse(data);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.display_name).sort()).toEqual(['Ada', 'Zoe']);
    for (const row of rows) {
      expect(row.chart).not.toBeNull();
      expect(row.photos?.length).toBeGreaterThan(0);
    }
    expect(rows.find((row) => row.display_name === 'Zoe')?.is_super).toBe(true);
  });

  it('drops somebody once they have been answered', async () => {
    const back = await like(nil.client, nil.id, ada.id);
    expect(back.error).toBeNull();
    const { data } = await nil.client.from('liked_me').select('*');
    const rows = LikedMeRows.parse(data);
    expect(rows.map((row) => row.display_name)).toEqual(['Zoe']);
    // …and that answer is a match, because their like was already in.
    const { data: matched } = await nil.client
      .from('match_profiles')
      .select('id')
      .eq('id', ada.id);
    expect(z.array(z.object({ id: z.string() })).parse(matched)).toHaveLength(
      1,
    );
  });

  it('is closed to anon', async () => {
    const { error } = await anonClient().from('liked_me').select('*');
    expect(error).not.toBeNull();
  });
});
