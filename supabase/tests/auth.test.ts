import { afterAll, describe, expect, it } from 'vitest';
import { adminClient, anonClient, deleteUsers, type TestUser } from './local';

/**
 * The password door (ROADMAP, Track A): what GoTrue answers to the four
 * things `app/sign-in.tsx` does, against the local stack as
 * `supabase/config.toml` configures it — `[auth.email]
 * enable_confirmations = false` and `minimum_password_length = 8`.
 *
 * Codes, not messages: `lib/errors.ts` maps the code, and the message is
 * the provider's to change. A wrong code here means the app shows the
 * generic line for a case it has a sentence for.
 */

const admin = adminClient();
const PASSWORD = 'correct-horse-battery';
const users: TestUser[] = [];

const freshAddress = (tag: string): string =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;

const email = freshAddress('door');

afterAll(async () => {
  await deleteUsers(admin, users);
});

describe('sign-up', () => {
  it('gives a fresh address a session at once, with the address confirmed', async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signUp({
      email,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    if (!data.user) throw new Error('signUp returned no user');
    // Cleanup covers the account whatever the assertions below say.
    users.push({ id: data.user.id, email, client });
    expect(data.user.email).toBe(email);
    // Confirmations off means auto-confirmed: this is the line that turns
    // red if the stack's config drifts back to sending a mail.
    expect(data.user.email_confirmed_at).toBeTruthy();
    expect(data.session).not.toBeNull();
  });

  it('refuses the same address again as an existing account', async () => {
    const { data, error } = await anonClient().auth.signUp({
      email,
      password: PASSWORD,
    });
    expect(error?.code).toBe('user_already_exists');
    expect(data.session).toBeNull();
    expect(data.user).toBeNull();
  });

  it('refuses a 5-character password as weak', async () => {
    const { data, error } = await anonClient().auth.signUp({
      email: freshAddress('weak'),
      password: 'abcde',
    });
    expect(error?.code).toBe('weak_password');
    expect(error?.status).toBe(422);
    expect(data.user).toBeNull();
    expect(data.session).toBeNull();
  });
});

describe('sign-in', () => {
  it('refuses the wrong password as invalid credentials', async () => {
    const { data, error } = await anonClient().auth.signInWithPassword({
      email,
      password: `${PASSWORD}-not`,
    });
    expect(error?.code).toBe('invalid_credentials');
    expect(data.session).toBeNull();
  });

  it('refuses an address nobody registered the same way', async () => {
    // Same code as a wrong password: the API does not say which half was
    // wrong, and neither does the app's sentence.
    const { error } = await anonClient().auth.signInWithPassword({
      email: freshAddress('nobody'),
      password: PASSWORD,
    });
    expect(error?.code).toBe('invalid_credentials');
  });

  it('gives the right password a session', async () => {
    const { data, error } = await anonClient().auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session?.user.email).toBe(email);
  });
});
