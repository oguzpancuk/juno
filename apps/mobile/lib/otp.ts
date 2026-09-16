import { z } from 'zod';

/**
 * The six-digit code that confirms an address at sign-up.
 *
 * GoTrue mails it (`supabase/config.toml` `[auth.email] otp_length` and
 * `[auth.email.template.confirmation]`) and `app/verify.tsx` trades it for
 * a session. The rules live here, away from the screen, so the battery can
 * hold them: the screen decides what a person sees, these decide what
 * counts as a code at all.
 */

/** `[auth.email] otp_length`. The two must agree or nothing ever verifies. */
export const OTP_LENGTH = 6;

/**
 * How long the "Tekrar gönder" link stays dark after a send. The server has
 * its own floor (`[auth.email] max_frequency`) and answers a send made too
 * soon with `over_email_send_rate_limit`; this is the countdown that keeps
 * a person from meeting it.
 */
export const RESEND_COOLDOWN_MS = 60_000;

/**
 * What a field is allowed to hold while it is being typed.
 *
 * Digits only, at most six of them. A code pasted out of a mail client
 * arrives with spaces around it often enough — "123 456", a trailing
 * newline — that stripping is the difference between a paste that works
 * and a person retyping what they can already see.
 */
export function normalizeOtp(raw: string): string {
  return raw.replace(/\D/gu, '').slice(0, OTP_LENGTH);
}

/** Exactly the code GoTrue will accept, after normalisation. */
export const otpSchema = z
  .string()
  .transform(normalizeOtp)
  .refine((code) => code.length === OTP_LENGTH);

/** Whether there is a whole code to send. */
export function isCompleteOtp(raw: string): boolean {
  return otpSchema.safeParse(raw).success;
}

/**
 * What to do with a refused request for a mail.
 *
 * `wait` means the server is rate-limiting this address or this project,
 * so the countdown starts whether or not the screen was already counting.
 * What it deliberately does NOT mean is that a code was just sent: GoTrue
 * answers both the per-address floor (`[auth.email] max_frequency`) and
 * the project's hourly ceiling (`[auth.rate_limit] email_sent`) with
 * `over_email_send_rate_limit`, and under the ceiling nothing was sent at
 * all — the address may hold nothing but a code that expired. A screen
 * that says "the one you have still works" would be lying to the person
 * it is least able to help.
 *
 * Anything else is `error`: a refusal the person can read and act on.
 */
export type RefusedSend = 'wait' | 'error';

export function refusedSend(code: string | undefined): RefusedSend {
  return code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit'
    ? 'wait'
    : 'error';
}

/**
 * Seconds left on the resend countdown, rounded up so the link never reads
 * "0 sn" while it is still dark. `null` means nothing has been sent and
 * the link is free; the code screen does not use that branch — it starts
 * the countdown at its own mount, because the mail that brought the person
 * there was sent by `signUp` a moment earlier and the server's
 * `max_frequency` is already running against it.
 */
export function resendSecondsLeft(sentAt: number | null, now: number): number {
  if (sentAt === null) return 0;
  const elapsed = now - sentAt;
  if (elapsed >= RESEND_COOLDOWN_MS) return 0;
  // A clock that went backwards (a manual time change, an NTP step) would
  // otherwise read as a countdown longer than the cooldown itself.
  if (elapsed < 0) return RESEND_COOLDOWN_MS / 1000;
  return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
}
