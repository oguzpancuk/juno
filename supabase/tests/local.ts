import {
  execFileSync,
  type ExecFileSyncOptionsWithStringEncoding,
} from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from './database.types';

/**
 * Keys and URL of the running local stack. `supabase status` is the source
 * of truth so nothing is hard-coded; if the stack is down this throws with
 * the command to run — a missing stack is a FAIL, never a skip.
 */
const StatusSchema = z.object({
  API_URL: z.string().url(),
  ANON_KEY: z.string().min(1),
  SERVICE_ROLE_KEY: z.string().min(1),
});

export type LocalStack = z.infer<typeof StatusSchema>;

/**
 * Client typed from `supabase gen types typescript --local`
 * (tests/database.types.ts, regenerate after every migration). Reads are
 * still parsed with Zod: the generated types describe the schema, not
 * what a policy lets through.
 */
export type Client = SupabaseClient<Database>;

/** Pinned CLI; CI installs the same version via supabase/setup-cli. */
export const SUPABASE_CLI_VERSION = '2.117.0';

/**
 * Prefer a `supabase` binary on PATH (CI's setup-cli); otherwise the
 * pinned npm package through npx (local dev). Never `supabase@latest`.
 */
let cliChecked = false;

export function supabaseCli(args: readonly string[]): string {
  const options: ExecFileSyncOptionsWithStringEncoding = {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  const run = (file: string, prefix: readonly string[]) => {
    if (!cliChecked) {
      // A stray global CLI must not silently run status/gen-types.
      const version = execFileSync(
        file,
        [...prefix, '--version'],
        options,
      ).trim();
      if (!version.endsWith(SUPABASE_CLI_VERSION)) {
        throw new Error(
          `supabase CLI ${version} found, ${SUPABASE_CLI_VERSION} required`,
        );
      }
      cliChecked = true;
    }
    return execFileSync(file, [...prefix, ...args], options);
  };
  try {
    return run('supabase', []);
  } catch (error) {
    if (error instanceof Error && error.message.includes('required'))
      throw error;
    return run('npx', [`supabase@${SUPABASE_CLI_VERSION}`]);
  }
}

let cached: LocalStack | undefined;

export function localStack(): LocalStack {
  if (cached) return cached;
  let raw: string;
  try {
    raw = supabaseCli(['status', '-o', 'json']);
  } catch (error) {
    throw new Error(
      `local Supabase stack is not running (run: npx supabase start)\n${String(error)}`,
    );
  }
  cached = StatusSchema.parse(JSON.parse(raw));
  return cached;
}

export function adminClient(): Client {
  const { API_URL, SERVICE_ROLE_KEY } = localStack();
  return createClient<Database>(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): Client {
  const { API_URL, ANON_KEY } = localStack();
  return createClient<Database>(API_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  readonly id: string;
  readonly email: string;
  readonly client: Client;
}

const PASSWORD = 'stardate-test-password';

/** Creates a confirmed user and returns a client signed in as them. */
export async function createUser(
  admin: Client,
  tag: string,
): Promise<TestUser> {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signIn.error) throw new Error(`signIn: ${signIn.error.message}`);
  return { id: data.user.id, email, client };
}

/** Best-effort cleanup: every user is attempted; failures are reported together. */
export async function deleteUsers(
  admin: Client,
  users: readonly TestUser[],
): Promise<void> {
  const failures: string[] = [];
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) failures.push(`${user.email}: ${error.message}`);
  }
  if (failures.length > 0)
    throw new Error(`deleteUsers:\n${failures.join('\n')}`);
}
