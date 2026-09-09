import { afterAll, beforeAll, expect, it } from 'vitest';
import { z } from 'zod';
import { ANKARA, ISTANBUL_NEARBY, STARTER, profileRow } from './fixtures';
import { adminClient, createUser, deleteUsers, type TestUser } from './local';

/**
 * The chat done-when clause: a message crosses to the other member of the
 * match while the thread is open, and reaches nobody else. This is the
 * same path `apps/mobile/lib/chat.ts` uses — postgres_changes on
 * `messages`, filtered by match, under the sender's own RLS.
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
      .channel(`test-messages:${match}:${as.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
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
    const { error } = await client.client.from('profiles').insert(row);
    if (error) throw new Error(`insert ${row.display_name}: ${error.message}`);
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
