import { z } from 'zod';

/**
 * What the two provider buttons mean, away from the modules that can only
 * run on a phone.
 *
 * `lib/providers.ts` (native) and `lib/providers.web.ts` do the talking —
 * one through Apple's and Google's own SDKs, the other through a browser
 * redirect — and neither can be loaded by the battery. Everything that can
 * be decided without a device is decided here so it can be tested: which
 * buttons a platform may show, and what a failure is called.
 */

export const PROVIDERS = ['apple', 'google'] as const;
export type Provider = (typeof PROVIDERS)[number];

/**
 * The end of a provider round trip.
 *
 * A cancellation is not a failure: closing Apple's sheet is an answer, and
 * a red sentence for it reads as a bug the person caused. The screen shows
 * nothing at all for `cancelled`.
 */
export type ProviderOutcome =
  | { readonly status: 'signed-in' }
  | { readonly status: 'cancelled' }
  // The web client only: the tab is on its way to the provider and this
  // page is about to be replaced. Nothing to show, and nothing to undo —
  // the button stays busy for the moment it has left.
  | { readonly status: 'redirected' }
  | { readonly status: 'failed'; readonly message: string };

/**
 * The Google client IDs, as Google Cloud writes them. The shape is checked
 * because the failure it prevents is mute: a client ID with a typo makes
 * the Google sheet open and close again with a bare "developer error",
 * and the iOS URL scheme is derived from this exact string.
 */
export const googleClientIdSchema = z
  .string()
  .regex(/^[\w-]+\.apps\.googleusercontent\.com$/u);

/**
 * The URL scheme iOS must register for Google to come back to the app:
 * the client ID with its two halves swapped, which is what Google Cloud
 * calls the reversed client ID and prints in the downloaded plist.
 *
 * Derived rather than configured, because the two being out of step is a
 * silent failure — the sheet opens, the person signs in, and nothing
 * returns. `app.config.ts` uses the same rule at build time.
 */
export function reversedClientId(clientId: string): string {
  const parsed = googleClientIdSchema.safeParse(clientId);
  if (!parsed.success) throw new Error(`not a Google client ID: ${clientId}`);
  const [id] = clientId.split('.apps.googleusercontent.com');
  return `com.googleusercontent.apps.${id}`;
}

/**
 * What a provider's sheet handed back: a token, or the reason there is
 * none. The two reasons are not the same thing, and folding them together
 * is the bug this type exists to prevent — a sheet the person closed gets
 * no sentence, while a sheet that completed and produced nothing must get
 * one, or it is a button that did nothing.
 */
export type TokenResult =
  | { readonly token: string }
  | { readonly token: null; readonly cancelled: boolean };

/** A token worth exchanging with the auth provider. */
export interface Exchange {
  readonly status: 'exchange';
  readonly token: string;
}

/**
 * Either something to exchange, or the end of the round trip. `message` is
 * the sentence a failure shows; it is passed in so this file needs no UI
 * strings and the battery can hold the decision.
 */
export function tokenOutcome(
  result: TokenResult,
  message: string,
): Exchange | ProviderOutcome {
  // An empty string is nothing came back, whatever the type says. No SDK
  // is known to return one, and the exchange would fail anyway — but the
  // whole point of this function is that "nothing came back" has exactly
  // one meaning, and a falsy token reaching the provider would give it a
  // second.
  if (result.token) return { status: 'exchange', token: result.token };
  return result.token === null && result.cancelled
    ? { status: 'cancelled' }
    : { status: 'failed', message };
}

export interface AvailabilityInput {
  /** `Platform.OS`. */
  readonly platform: string;
  /** Whether the device itself offers Sign in with Apple. */
  readonly appleNative: boolean;
  /** Whether the build carries a Google web client ID. */
  readonly googleConfigured: boolean;
}

export type Availability = Readonly<Record<Provider, boolean>>;

/**
 * Which provider buttons a screen may draw.
 *
 * A button with nothing behind it was the state this replaces (owner,
 * 2026-09-11: "arkası şimdilik boş kalsın"), and App Store Review
 * Guideline 4.8 is the reason it cannot stay: a reviewer taps them. So a
 * provider that cannot work on this build, on this platform, is not shown
 * at all rather than shown and apologised for.
 *
 * Apple is iOS only, and deliberately: the browser route to it needs an
 * Apple Services ID and a signing key that the App ID alone does not give
 * (docs/auth-setup.md), so until those exist the web and Android clients
 * would show a button that opens a page saying "invalid_client". E-mail
 * and password are the way in there. Google needs a client ID compiled
 * into the build, and works on every platform once it has one.
 */
export function availability(input: AvailabilityInput): Availability {
  const apple = input.platform === 'ios' ? input.appleNative : false;
  return { apple, google: input.googleConfigured };
}

/**
 * The domain Apple hands out when the person picks "Hide My Email": a
 * relay address, unique to this app, that forwards to the real one.
 */
export const APPLE_RELAY_DOMAIN = 'privaterelay.appleid.com';

/**
 * What GoTrue writes into the session's `app_metadata` about how the
 * account signs in: the provider it was opened with, and every one linked
 * to it since. Read, not trusted to be there — a session restored from an
 * older build may not carry `providers`.
 */
const appMetadataSchema = z.object({
  provider: z.string().optional(),
  providers: z.array(z.string()).optional(),
});

export interface AccountNoteInput {
  /** `session.user.email`. */
  readonly email: string | undefined;
  /** `session.user.app_metadata`, as the session carries it. */
  readonly appMetadata: unknown;
}

/**
 * What onboarding says about the account it is about to fill in.
 *
 * Supabase links Apple or Google to an existing e-mail account on its own
 * when the provider vouches for the same address (ADR-0013). When the
 * addresses differ — another Google account, or Apple's Hide My Email —
 * the result is a second, empty account, and the only screen that can
 * tell the person is this one: it is where a returning member would
 * otherwise start typing their birth data a second time.
 *
 * - `null`: the account was opened with e-mail, or nothing can be said.
 *   A provider linked onto an e-mail account is that same account.
 * - `provider`: opened by Apple or Google, with this address.
 * - `relay`: opened by Apple with a hidden address, which no e-mail
 *   account here can ever share.
 */
export type AccountNote =
  | {
      readonly kind: 'provider';
      readonly provider: Provider;
      readonly email: string;
    }
  | { readonly kind: 'relay' }
  | null;

export function accountNote(input: AccountNoteInput): AccountNote {
  const parsed = appMetadataSchema.safeParse(input.appMetadata);
  if (!parsed.success || !input.email) return null;
  const { provider, providers } = parsed.data;
  const methods = providers ?? (provider ? [provider] : []);
  if (methods.includes('email')) return null;
  // The one it was opened with first, when it says; a later link second.
  const opener = [provider, ...methods].find((method): method is Provider =>
    PROVIDERS.some((known) => known === method),
  );
  if (!opener) return null;
  if (
    opener === 'apple' &&
    input.email.toLowerCase().endsWith(`@${APPLE_RELAY_DOMAIN}`)
  ) {
    return { kind: 'relay' };
  }
  return { kind: 'provider', provider: opener, email: input.email };
}
