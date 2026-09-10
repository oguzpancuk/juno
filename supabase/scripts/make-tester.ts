/**
 * Local-only: create a confirmed tester with a real chart, so a simulator
 * session can sign in with OTP and land past onboarding.
 *
 *   npx tsx supabase/scripts/make-tester.ts <e-mail> [name]
 *
 * Uses the local service-role key from `supabase status`; refuses any
 * non-local API URL. Idempotent: an existing user keeps their id.
 */
import { execFileSync } from 'node:child_process';
import { bigThree, computeChart, toPublicChart } from '@juno/astro';
import { resolveBirth } from '@juno/geo';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const email: string | undefined = process.argv[2];
const name = process.argv[3] ?? 'Test';
if (email === undefined)
  throw new Error('usage: make-tester.ts <e-mail> [name]');
// Narrowing does not survive into the async closure below.
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

const ISTANBUL = 745044;
const LOCAL = { year: 1995, month: 7, day: 14, hour: 3, minute: 30 };

async function main(): Promise<void> {
  const existing = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (existing.error) throw existing.error;
  const found = existing.data.users.find((u) => u.email === testerEmail);
  const id =
    found?.id ??
    (await (async () => {
      const created = await admin.auth.admin.createUser({
        email: testerEmail,
        email_confirm: true,
      });
      if (created.error) throw created.error;
      return created.data.user.id;
    })());

  const birth = resolveBirth({ cityId: ISTANBUL, local: LOCAL });
  const chart = toPublicChart(
    computeChart({
      utc: birth.utc,
      latitude: birth.latitude,
      longitude: birth.longitude,
    }),
  );
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${LOCAL.year}-${pad(LOCAL.month)}-${pad(LOCAL.day)}`;
  const { error } = await admin.from('profiles').upsert({
    id,
    display_name: name,
    birth_date: date,
    birth_local: `${date}T${pad(LOCAL.hour)}:${pad(LOCAL.minute)}:00`,
    birth_city_id: ISTANBUL,
    birth_utc: birth.utc.toISOString(),
    chart,
    big_three: bigThree(chart),
    gender: 'woman',
    interested_in: 'men',
    location: 'SRID=4326;POINT(29.02 41.03)',
    radius_km: 50,
    // Mirrors LEGAL_VERSION in apps/mobile/lib/legal.ts; a profile cannot
    // exist without a record of the notice having been accepted.
    consent_version: '2026-09-09',
  });
  if (error) throw error;
  console.log(`tester ${testerEmail} (${name}) ready: ${id}`);
}

await main();
