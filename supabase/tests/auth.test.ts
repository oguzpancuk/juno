import { afterAll, describe, expect, it } from 'vitest';
import { adminClient, anonClient, deleteUsers, type TestUser } from './local';
import { codeIn, mailsFor, waitForMail } from './mailpit';

/**
 * The door (ROADMAP, "E-posta doğrulama kodu"): what GoTrue answers to the
 * five things `app/sign-in.tsx` and `app/verify.tsx` do, against the local
 * stack as `supabase/config.toml` configures it — `[auth.email]
 * enable_confirmations = true`, `otp_length = 6`, and
 * `minimum_password_length = 8`.
 *
 * The mail is half the feature, so the mail is read here rather than
 * assumed: the owner's ask of 2026-09-16 was that the code actually be
 * delivered, and a test that only checks `signUp` returns no session would
 * pass with the mailer switched off entirely.
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

/** Remembers an account by address, so cleanup covers it whatever fails. */
async function remember(address: string): Promise<void> {
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((candidate) => candidate.email === address);
  if (user) users.push({ id: user.id, email: address, client: anonClient() });
}

afterAll(async () => {
  await deleteUsers(admin, users);
});

describe('sign-up', () => {
  it('mails a six-digit code and withholds the session', async () => {
    const { data, error } = await anonClient().auth.signUp({
      email,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    await remember(email);
    if (!data.user) throw new Error('signUp returned no user');
    expect(data.user.email).toBe(email);
    // The two halves of confirmations being on: no session yet, and the
    // address not confirmed. These are the lines that turn red if the
    // stack's config drifts back to auto-confirming.
    expect(data.session).toBeNull();
    expect(data.user.email_confirmed_at).toBeFalsy();

    const [mail] = await waitForMail(email);
    if (!mail) throw new Error('waitForMail returned nothing');
    expect(mail.Subject).toBe('Juno doğrulama kodun');
    // Sender and subject are what a person scans for in a crowded inbox,
    // and both come from config rather than from the template.
    expect(mail.From.Name).toBe('Juno');
    expect(codeIn(mail)).toMatch(/^\d{6}$/u);
  });

  it('refuses a sign-in until the code is spent', async () => {
    // The code `app/sign-in.tsx` turns into a push to `/verify?resend=1`
    // rather than a sentence.
    const { data, error } = await anonClient().auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    expect(error?.code).toBe('email_not_confirmed');
    expect(error?.status).toBe(400);
    expect(data.session).toBeNull();
  });

  it('refuses a code that was never issued', async () => {
    const { data, error } = await anonClient().auth.verifyOtp({
      email,
      token: '000000',
      type: 'signup',
    });
    // GoTrue gives a wrong code and an expired one the same answer, which
    // is why `lib/errors.ts` has one sentence for both.
    expect(error?.code).toBe('otp_expired');
    expect(error?.status).toBe(403);
    expect(data.session).toBeNull();
  });

  it('sends a second code on resend, and that one opens the account', async () => {
    // `[auth.email] max_frequency` is a second locally; the code screen's
    // own countdown is a minute (`lib/otp.ts` RESEND_COOLDOWN_MS).
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const { error } = await anonClient().auth.resend({ type: 'signup', email });
    expect(error).toBeNull();

    const mails = await waitForMail(email, 2);
    expect(mails.length).toBeGreaterThanOrEqual(2);
    // Newest first, which is the one the person is looking at.
    const [newest] = mails;
    if (!newest) throw new Error('waitForMail returned nothing');
    const code = codeIn(newest);

    const verified = await anonClient().auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });
    expect(verified.error).toBeNull();
    expect(verified.data.session?.user.email).toBe(email);
    expect(verified.data.user?.email_confirmed_at).toBeTruthy();
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

  it('refuses a 5-character password as weak, and mails nothing', async () => {
    const weak = freshAddress('weak');
    const { data, error } = await anonClient().auth.signUp({
      email: weak,
      password: 'abcde',
    });
    expect(error?.code).toBe('weak_password');
    expect(error?.status).toBe(422);
    expect(data.user).toBeNull();
    expect(data.session).toBeNull();
    expect(await mailsFor(weak)).toEqual([]);
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

  it('gives the right password a session once the address is confirmed', async () => {
    const { data, error } = await anonClient().auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session?.user.email).toBe(email);
  });
});
