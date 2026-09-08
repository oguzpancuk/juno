/**
 * Local-only: post a message from a seeded user into their match with a
 * real tester, so the live-update path can be watched in the simulator.
 *
 *   npx tsx supabase/scripts/seed-message.ts <tester e-mail> <text> [seed name]
 *
 * Uses the local service-role key from `supabase status`; refuses any
 * non-local API URL.
 */
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const email: string | undefined = process.argv[2];
const text: string | undefined = process.argv[3];
const seedName = process.argv[4] ?? 'deniz';
if (email === undefined || text === undefined)
  throw new Error('usage: seed-message.ts <tester e-mail> <text> [seed name]');
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

  const sent = new Date();
  const { error } = await admin
    .from('messages')
    .insert({ match_id: match.id, sender_id: seed.id, body });
  if (error) throw error;
  console.log(
    `${seed.display_name} → ${testerEmail}: "${body}" at ${sent.toISOString()}`,
  );
}

await main();
