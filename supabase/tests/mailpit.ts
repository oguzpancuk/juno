import { z } from 'zod';
import { localStack } from './local';

/**
 * Reading the local inbox.
 *
 * With `[auth.email] enable_confirmations` on, the six-digit code only
 * exists inside the mail GoTrue sends; nothing in the API hands it back.
 * The battery therefore does what a person does — opens the inbox — which
 * is also the only way it can prove the mail was sent at all. Locally that
 * inbox is Mailpit (`[local_smtp]`, port 54324), which accepts every
 * message and delivers none.
 *
 * The hosted project swaps Mailpit for real SMTP; nothing here runs against
 * it, and the same code path is what ships.
 */

const MessageSchema = z.object({
  ID: z.string(),
  Subject: z.string(),
  From: z.object({ Name: z.string(), Address: z.string() }),
});

const SearchSchema = z.object({
  messages: z.array(MessageSchema),
});

const MessageBodySchema = z.object({
  Subject: z.string(),
  Text: z.string(),
  HTML: z.string(),
  From: z.object({ Name: z.string(), Address: z.string() }),
});

export type Mail = z.infer<typeof MessageBodySchema>;

async function json(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`mailpit ${response.status} for ${url}`);
  }
  return response.json();
}

/**
 * Every mail addressed to `email`, newest first. Mailpit orders its search
 * that way; the tests only ever want the newest, so the order is asserted
 * by the resend test rather than assumed everywhere.
 */
export async function mailsFor(email: string): Promise<Mail[]> {
  const { MAILPIT_URL } = localStack();
  const query = encodeURIComponent(`to:${email}`);
  const found = SearchSchema.parse(
    await json(`${MAILPIT_URL}/api/v1/search?query=${query}`),
  );
  const bodies: Mail[] = [];
  for (const message of found.messages) {
    bodies.push(
      MessageBodySchema.parse(
        await json(`${MAILPIT_URL}/api/v1/message/${message.ID}`),
      ),
    );
  }
  return bodies;
}

/**
 * Waits for a mail to land. GoTrue answers the sign-up before its mailer
 * has finished, so a read taken the same millisecond finds an empty inbox;
 * this polls instead of sleeping a guessed amount. A mail that never
 * arrives fails here rather than further on as a missing code.
 */
export async function waitForMail(
  email: string,
  count = 1,
  timeoutMs = 10_000,
): Promise<Mail[]> {
  const deadline = Date.now() + timeoutMs;
  let mails: Mail[] = [];
  for (;;) {
    mails = await mailsFor(email);
    if (mails.length >= count) return mails;
    if (Date.now() > deadline) {
      throw new Error(
        `no mail for ${email} after ${timeoutMs} ms (wanted ${count}, saw ${mails.length})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** The six digits the confirmation template renders as `{{ .Token }}`. */
export function codeIn(mail: Mail): string {
  const match = /\b\d{6}\b/u.exec(mail.Text);
  if (!match) throw new Error(`no six-digit code in mail: ${mail.Text}`);
  return match[0];
}
