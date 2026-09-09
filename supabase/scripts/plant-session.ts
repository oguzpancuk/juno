/**
 * Local-only: sign a tester in and write the session into Expo Go's
 * AsyncStorage on the booted simulator, so a screen behind the sign-in
 * gate can be opened directly.
 *
 *   npx tsx supabase/scripts/plant-session.ts <e-mail>
 *
 * Text injection into a React Native TextInput does not work in this
 * simulator setup, so the OTP cannot be typed; this plants the session the
 * app would have stored. Uses the local service-role key from
 * `supabase status`; refuses any non-local API URL.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const argument = process.argv[2];
if (argument === undefined) throw new Error('usage: plant-session.ts <e-mail>');
// Narrowing does not survive into the async closure below.
const email: string = argument;

const Status = z.object({
  API_URL: z.string().url(),
  ANON_KEY: z.string(),
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

/** The key supabase-js derives from the API URL's hostname. */
const STORAGE_KEY = 'sb-127-auth-token';
/** AsyncStorage keeps a long value in a file named by the key's MD5. */
const INLINE_LIMIT = 1024;

const Booted = z.object({
  devices: z.record(
    z.string(),
    z.array(z.object({ udid: z.string(), state: z.string() })),
  ),
});

function bootedDevices(): string[] {
  const listed = Booted.parse(
    JSON.parse(
      execFileSync('xcrun', ['simctl', 'list', 'devices', '-j'], {
        encoding: 'utf8',
      }),
    ),
  );
  return Object.values(listed.devices)
    .flat()
    .filter((d) => d.state === 'Booted')
    .map((d) => d.udid);
}

/** Every Expo Go storage directory on the booted simulators. */
function storageDirs(): string[] {
  const dirs: string[] = [];
  for (const udid of bootedDevices()) {
    const apps = join(
      homedir(),
      'Library/Developer/CoreSimulator/Devices',
      udid,
      'data/Containers/Data/Application',
    );
    if (!existsSync(apps)) continue;
    for (const app of readdirSync(apps)) {
      const anonymous = join(
        apps,
        app,
        'Documents/ExponentExperienceData/@anonymous',
      );
      if (!existsSync(anonymous)) continue;
      for (const slug of readdirSync(anonymous)) {
        const dir = join(anonymous, slug, 'RCTAsyncLocalStorage');
        if (existsSync(dir)) dirs.push(dir);
      }
    }
  }
  return dirs;
}

async function main(): Promise<void> {
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (link.error) throw link.error;
  const anon = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await anon.auth.verifyOtp({
    type: 'email',
    token_hash: link.data.properties.hashed_token,
  });
  if (verified.error) throw verified.error;
  const session = verified.data.session;
  if (!session) throw new Error('no session returned');

  const value = JSON.stringify(session);
  const dirs = storageDirs();
  if (dirs.length === 0)
    throw new Error('no Expo Go storage on a booted simulator');
  for (const dir of dirs) {
    const manifestPath = join(dir, 'manifest.json');
    const manifest: Record<string, string | null> = existsSync(manifestPath)
      ? z
          .record(z.string(), z.string().nullable())
          .parse(JSON.parse(readFileSync(manifestPath, 'utf8')))
      : {};
    if (value.length > INLINE_LIMIT) {
      const file = createHash('md5').update(STORAGE_KEY).digest('hex');
      writeFileSync(join(dir, file), value);
      manifest[STORAGE_KEY] = null;
    } else {
      manifest[STORAGE_KEY] = value;
    }
    writeFileSync(manifestPath, JSON.stringify(manifest));
    console.log(`planted in ${dir}`);
  }
  console.log(`signed in as ${session.user.id}`);
}

await main();
