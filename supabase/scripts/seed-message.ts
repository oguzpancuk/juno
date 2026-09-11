/**
 * Local-only: post a message from a seeded user into their match with a
 * real tester, so the live-update path can be watched in the simulator.
 *
 *   npx tsx supabase/scripts/seed-message.ts [--reply] <tester e-mail> <text> [seed name]
 *
 * `--reply` makes it a reply to the tester's latest message in that match,
 * so the quote block can be watched too; it fails when the tester has not
 * written yet, rather than posting a plain message and calling it a reply.
 *
 * Uses the local service-role key from `supabase status`; refuses any
 * non-local API URL.
 */
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const REPLY_FLAG = '--reply';
const args = process.argv.slice(2);
const asReply = args.includes(REPLY_FLAG);
const positional = args.filter((arg) => arg !== REPLY_FLAG);
const email: string | undefined = positional[0];
const text: string | undefined = positional[1];
const seedName = positional[2] ?? 'deniz';
if (email === undefined || text === undefined)
  throw new Error(
    'usage: seed-message.ts [--reply] <tester e-mail> <text> [seed name]',
  );
// Narrowing does not survive into the async closure below.
const testerEmail: string = email;
const body: string = text;

const Status = z.object({
  API_URL: z.string().url(),
  SERVICE_ROLE_KEY: z.string(),
});
const status = Status.parse(
  JSON.parse(
    execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
    }),
  ),
);
const host = new URL(status.API_URL).hostname;
if (host !== '127.0.0.1' && host !== 'localhost') {
  console.error(`refusing to run against ${status.API_URL}`);
  process.exit(1);
}
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const Profile = z.object({ id: z.string().uuid(), display_name: z.string() });
const Match = z.object({ id: z.string().uuid() });
const MaybeMessage = z.object({ id: z.string().uuid() }).nullable();

async function main(): Promise<void> {
  const users = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) throw users.error;
  const tester = users.data.users.find((u) => u.email === testerEmail);
  if (!tester) throw new Error(`no auth user for ${testerEmail}`);

  const seed = Profile.parse(
    (
      await admin
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', seedName)
        .single()
    ).data,
  );

  const [a, b] =
    seed.id < tester.id ? [seed.id, tester.id] : [tester.id, seed.id];
  const match = Match.parse(
    (await admin.from('matches').select('id').eq('a', a).eq('b', b).single())
      .data,
  );

  let replyTo: string | null = null;
  if (asReply) {
    // The same (created_at, id) order the app pages by.
    const latest = MaybeMessage.parse(
      (
        await admin
          .from('messages')
          .select('id')
          .eq('match_id', match.id)
          .eq('sender_id', tester.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data,
    );
    if (latest === null)
      throw new Error(
        `${REPLY_FLAG}: ${testerEmail} has no message in this match yet`,
      );
    replyTo = latest.id;
  }

  const sent = new Date();
  const { error } = await admin.from('messages').insert({
    match_id: match.id,
    sender_id: seed.id,
    body,
    reply_to: replyTo,
  });
  if (error) throw error;
  console.log(
    `${seed.display_name} → ${testerEmail}: "${body}"${replyTo === null ? '' : ` (reply to ${replyTo})`} at ${sent.toISOString()}`,
  );
}

await main();
