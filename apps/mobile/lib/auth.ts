import { z } from 'zod';

/**
 * What the sign-in screen accepts before it talks to the auth provider.
 *
 * The server has the same rules (`supabase/config.toml`
 * `minimum_password_length`, bcrypt's own input cap), so checking here
 * changes nothing about what gets stored; it decides which sentence the
 * person reads, and that the submit button stays dimmed until there is
 * something worth sending.
 */

export const AUTH_MODES = ['in', 'up'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

/**
 * The screen's mode, from its route param. Anything that is not one of
 * the two — a missing param, a mistyped deep link — opens sign-up: it is
 * the door welcome's primary button opens, and a newcomer sent to the
 * wrong mode is the costlier mistake.
 */
export const modeParamSchema = z.enum(AUTH_MODES).catch('up');

export const PASSWORD_MIN = 8;
/** bcrypt hashes the first 72 bytes and GoTrue refuses anything longer. */
export const PASSWORD_MAX = 72;

export const credentialsSchema = z.object({
  // Trimmed and lowercased before the format check, so a trailing space
  // from the keyboard or a capitalised address is not a rejection.
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export type CredentialsResult =
  | { readonly ok: true; readonly value: Credentials }
  | { readonly ok: false; readonly field: 'email' | 'password' };

/**
 * The form's two fields as the schema sees them. On failure the field
 * named is the first one on the form that is wrong, so the message the
 * screen shows points at the top-most problem.
 */
export function parseCredentials(input: {
  readonly email: string;
  readonly password: string;
}): CredentialsResult {
  const parsed = credentialsSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const failed = parsed.error.issues.some((issue) => issue.path[0] === 'email')
    ? 'email'
    : 'password';
  return { ok: false, field: failed };
}
