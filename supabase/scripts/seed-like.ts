/**
 * Local-only: make a seeded user like a real tester so a mutual like can
 * be exercised in the simulator (ROADMAP S7).
 *
 *   npx tsx supabase/scripts/seed-like.ts <tester e-mail> [seed name]
 *
 * Uses the local service-role key from `supabase status`; refuses any
 * non-local API URL.
 */
import { execFileSync } from 'node:child_process';
import { PublicChartSchema, isLesserId, starterKey } from '@stardate/astro';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const email: string | undefined = process.argv[2];
const seedName = process.argv[3] ?? 'deniz';
if (email === undefined)
  throw new Error('usage: seed-like.ts <tester e-mail> [seed name]');
const testerEmail: string = email;

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

const Row = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  chart: PublicChartSchema,
});

async function main(): Promise<void> {
  const users = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) throw users.error;
  const tester = users.data.users.find(
    (u) => u.email?.toLowerCase() === testerEmail.toLowerCase(),
  );
  if (!tester) throw new Error(`no auth user with e-mail ${testerEmail}`);
  const seedEmail = `${seedName.toLowerCase()}@seed.local`;
  const seed = users.data.users.find((u) => u.email === seedEmail);
  if (!seed)
    throw new Error(`no seed user ${seedEmail} (run gen-seed + db reset)`);

  const rows = await admin
    .from('profiles')
    .select('id, display_name, chart')
    .in('id', [tester.id, seed.id]);
  if (rows.error) throw rows.error;
  const parsed = z.array(Row).parse(rows.data);
  const t = parsed.find((r) => r.id === tester.id);
  const s = parsed.find((r) => r.id === seed.id);
  if (!t || !s) throw new Error('both profiles must exist');

  const key = isLesserId(t.id, s.id)
    ? starterKey(t.chart, s.chart)
    : starterKey(s.chart, t.chart);
  if (!key) throw new Error('no shared aspect between these charts');
  const { error } = await admin
    .from('likes')
    .insert({ from_id: s.id, to_id: t.id, kind: 'like', starter_key: key });
  if (error && error.code !== '23505') throw new Error(error.message);
  console.log(
    `${s.display_name} → ${t.display_name}: like (${key})${error ? ' (already existed)' : ''}`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
