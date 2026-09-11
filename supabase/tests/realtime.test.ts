import { afterAll, beforeAll, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ANKARA,
  ISTANBUL_NEARBY,
  STARTER,
  insertProfileRow,
  profileRow,
} from './fixtures';
import { adminClient, createUser, deleteUsers, type TestUser } from './local';

/**
 * The chat done-when clause: a message crosses to the other member of the
 * match while the thread is open, and reaches nobody else. This is the
 * same path `apps/mobile/lib/chat.ts` uses — postgres_changes on
 * `messages`, filtered by match, under the sender's own RLS.
 *
 * The second test is the read receipt going the other way: the recipient
 * stamps `read_at`, and the sender's UPDATE binding must see the new row.
 * The publication publishes updates (20260909000002_safety.sql) and the
 * table keeps DEFAULT replica identity, so the payload carries the full
 * new row — which is what the match filter and the subscriber's RLS are
 * evaluated against. The plan entry of 2026-09-11 asserted that from the
 * docs; this is the measurement.
 */

const admin = adminClient();
const users: TestUser[] = [];
/** Generous enough for a cold Realtime socket; the assertion is the 2 s clause. */
const CROSSING_BUDGET_MS = 2000;

let ada: TestUser; // woman, wants men
let bora: TestUser; // man, wants women — matched with Ada
let cem: TestUser; // man in another city; in no match
let matchId: string;

const MatchRow = z.object({ match_id: z.string().uuid() });
const Message = z.object({
  id: z.string().uuid(),
  body: z.string(),
  match_id: z.string().uuid(),
  read_at: z.string().nullable(),
});

async function user(tag: string): Promise<TestUser> {
  const u = await createUser(admin, tag);
  users.push(u);
  return u;
}

/** Resolves with the first message event, or null when the budget passes. */
function waitForMessage(
  as: TestUser,
  match: string,
  budgetMs: number,
  event: 'INSERT' | 'UPDATE' = 'INSERT',
): { ready: Promise<void>; got: Promise<z.infer<typeof Message> | null> } {
  let onReady: () => void;
  const ready = new Promise<void>((resolve) => {
    onReady = resolve;
  });
  const got = new Promise<z.infer<typeof Message> | null>((resolve) => {
    const timer = setTimeout(() => {
      void as.client.removeChannel(channel);
      resolve(null);
    }, budgetMs);
    const channel = as.client
      .channel(`test-messages:${event}:${match}:${as.id}`)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${match}`,
        },
        (payload) => {
          const parsed = Message.safeParse(payload.new);
          if (!parsed.success) return;
          clearTimeout(timer);
          void as.client.removeChannel(channel);
          resolve(parsed.data);
        },
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') onReady();
      });
  });
  return { ready, got };
}

beforeAll(async () => {
  ada = await user('ada');
  bora = await user('bora');
  cem = await user('cem');
  const rows = [
    profileRow({
      id: ada.id,
      display_name: 'Ada',
      gender: 'woman',
      interested_in: 'men',
      lonLat: ISTANBUL_NEARBY,
    }),
    profileRow({
      id: bora.id,
      display_name: 'Bora',
      gender: 'man',
      interested_in: 'women',
      lonLat: ISTANBUL_NEARBY,
    }),
    profileRow({
      id: cem.id,
      display_name: 'Cem',
      gender: 'man',
      interested_in: 'women',
      lonLat: ANKARA,
    }),
  ];
  const clients = [ada, bora, cem];
  for (const [i, row] of rows.entries()) {
    const client = clients[i];
    if (!client) throw new Error('setup: client missing');
    await insertProfileRow(client.client, row);
  }
  await ada.client.from('likes').insert({
    from_id: ada.id,
    to_id: bora.id,
    kind: 'like',
    starter_key: STARTER,
  });
  await bora.client.from('likes').insert({
    from_id: bora.id,
    to_id: ada.id,
    kind: 'like',
    starter_key: STARTER,
  });
  const match = MatchRow.parse(
    (await ada.client.from('match_profiles').select('match_id').single()).data,
  );
  matchId = match.match_id;

  // Warm the path. The first postgres_changes binding after the containers
  // restart reports SUBSCRIBED and then drops its events, so this primer
  // is expected to be lost; what it buys is a second binding that works.
  // Nothing is asserted about it — the measurement is the test below.
  const warm = waitForMessage(ada, matchId, 20_000);
  await warm.ready;
  const primer = await bora.client
    .from('messages')
    .insert({ match_id: matchId, sender_id: bora.id, body: 'ısınma' })
    .select('id')
    .single();
  await warm.got;
  const primerId = z.object({ id: z.string().uuid() }).parse(primer.data).id;
  await admin.from('messages').delete().eq('id', primerId);
}, 45_000);

afterAll(async () => {
  await deleteUsers(admin, users);
});

it('a message reaches the other member within the budget and nobody else', async () => {
  const member = waitForMessage(ada, matchId, CROSSING_BUDGET_MS);
  const outsider = waitForMessage(cem, matchId, CROSSING_BUDGET_MS);
  // Subscribe first: a message sent before SUBSCRIBED is not replayed.
  await Promise.all([member.ready, outsider.ready]);

  const sentAt = Date.now();
  const { error } = await bora.client
    .from('messages')
    .insert({ match_id: matchId, sender_id: bora.id, body: 'Duyuyor musun?' });
  expect(error).toBeNull();

  const received = await member.got;
  const elapsed = Date.now() - sentAt;
  expect(received?.body).toBe('Duyuyor musun?');
  expect(elapsed).toBeLessThan(CROSSING_BUDGET_MS);

  // Cem is in no match: RLS must keep the row off his socket too.
  expect(await outsider.got).toBeNull();
  console.log(`message crossed in ${elapsed} ms`);
}, 30_000);

it('a read receipt reaches the sender within the budget and nobody else', async () => {
  const posted = await bora.client
    .from('messages')
    .insert({ match_id: matchId, sender_id: bora.id, body: 'Okudun mu?' })
    .select('id')
    .single();
  expect(posted.error).toBeNull();
  const sentId = z.object({ id: z.string().uuid() }).parse(posted.data).id;

  // The sender listens for updates the way `useThread` does; the outsider
  // listens the same way and must hear nothing.
  const sender = waitForMessage(bora, matchId, CROSSING_BUDGET_MS, 'UPDATE');
  const outsider = waitForMessage(cem, matchId, CROSSING_BUDGET_MS, 'UPDATE');
  await Promise.all([sender.ready, outsider.ready]);

  const readAt = Date.now();
  const marked = await ada.client
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', sentId);
  expect(marked.error).toBeNull();

  const received = await sender.got;
  const elapsed = Date.now() - readAt;
  expect(received?.id).toBe(sentId);
  // The full new row, not just the key: DEFAULT replica identity is enough.
  expect(received?.body).toBe('Okudun mu?');
  expect(received?.read_at).not.toBeNull();
  expect(elapsed).toBeLessThan(CROSSING_BUDGET_MS);

  expect(await outsider.got).toBeNull();
  console.log(`read receipt crossed in ${elapsed} ms`);
}, 30_000);
