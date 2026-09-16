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
