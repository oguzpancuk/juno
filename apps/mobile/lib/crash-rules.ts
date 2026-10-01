import type { ErrorEvent, ReactNativeOptions } from '@sentry/react-native';
import { z } from 'zod';

/**
 * What a crash report may carry, as pure rules (`lib/crash-reporting.ts`
 * hands them to Sentry).
 *
 * The privacy notice promises two things about Sentry (`lib/legal.ts`):
 * reports are kept in the EU, and nothing in them says who you are — no
 * name, e-mail, account id, location or message. The first is held by the
 * DSN's shape, the second by what is taken out of every event before it
 * leaves the device. Neither is left to a dashboard setting alone.
 */

const EU_DSN = /^https:\/\/[0-9a-f]{32}@o\d+\.ingest\.de\.sentry\.io\/\d+$/u;
const LOCAL_DSN = /^http:\/\/[0-9a-f]{32}@(127\.0\.0\.1|localhost):\d+\/\d+$/u;
const DSN_MESSAGE = 'a Sentry DSN in the EU region (…ingest.de.sentry.io)';

/**
 * A DSN of Sentry's EU region (`o<org>.ingest.de.sentry.io`), the only
 * kind a deployed build may carry: `lib/deploy-target.ts` refuses the
 * rest before `npm run deploy` exports anything. The DSN is public by
 * design — it can only send — but the auth token is a secret, and a token
 * pasted here would ship to every phone, so the shape is exact.
 */
export const deployableDsnSchema = z.string().regex(EU_DSN, DSN_MESSAGE);

/**
 * What the app itself accepts: the EU region, or a stand-in on this
 * machine for checking what would be sent.
 */
export const sentryDsnSchema = z
  .string()
  .refine((value) => EU_DSN.test(value) || LOCAL_DSN.test(value), DSN_MESSAGE);

/**
 * `EXPO_PUBLIC_SENTRY_DSN` as the app reads it: unset, empty or of the
 * wrong shape, it is "no reporting". A wrong one is not a startup
 * failure: that would blank the app for every visitor, and Sentry, never
 * started, would not see why. The refusal is at deploy time
 * (`lib/deploy-target.ts` `checkCrashReporting`), where the person who
 * set it is looking.
 */
export const reportingDsnSchema = z
  .preprocess(
    (value) => (value === '' ? undefined : value),
    sentryDsnSchema.optional(),
  )
  .catch(undefined);

/** `EXPO_PUBLIC_CRASH_TEST=1` opens `/crash-test`; anything else keeps it shut. */
export const crashTestSchema = z
  .string()
  .optional()
  .transform((value) => value === '1');

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu;
const EMAIL = /[^\s@()<>"',;:]+@[^\s@()<>"',;:]+\.[a-z]{2,}/giu;
/** A JWT: a session's access token, or a signed photo URL's `token`. */
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]*/gu;
/** `access_token=…`, `refresh_token=…`, `token=…`, `code=…` in a URL. */
const SECRET_PARAM = /\b([a-z_]*token|code)=[^&#\s"']+/giu;

/**
 * Account, match and message ids, e-mail addresses and tokens, replaced.
 * Tokens go first: a JWT's payload is the account id and the e-mail
 * address in base64, which the later patterns cannot see.
 */
export function scrub(text: string): string {
  return text
    .replace(JWT, '<token>')
    .replace(SECRET_PARAM, '$1=<token>')
    .replace(UUID, '<id>')
    .replace(EMAIL, '<email>');
}

/**
 * A URL as a report may carry it: origin and path only, scrubbed. On the
 * web a Google or Apple sign-in comes back as
 * `/#access_token=…&refresh_token=…`, and supabase-js clears that only
 * after a round trip, so an error in the first render would otherwise
 * send a live session; a query can carry a signed photo's token. A value
 * that is not a URL loses everything from its first `?` or `#` the same
 * way.
 */
export function scrubUrl(value: string): string {
  try {
    const url = new URL(value);
    return scrub(`${url.origin}${url.pathname}`);
  } catch {
    return scrub(value.replace(/[?#].*$/su, ''));
  }
}

/**
 * The iOS SDK's `device_app_hash`, a hash of Apple's vendor id, taken off
 * the app context. It reaches JS events through the scope the RN SDK
 * copies from native; native crash reports keep it (no hook reaches
 * them), and the notice names it.
 */
function withoutDeviceHash(
  app: Record<string, unknown>,
): Record<string, unknown> {
  const { device_app_hash: _hash, ...rest } = app;
  return rest;
}

/**
 * The event as it may leave the device: no user, no ids, no addresses, no
 * tokens. Breadcrumbs are not handled here because there are none:
 * `maxBreadcrumbs: 0` (below) stops both SDKs recording them, and that
 * option, not a filter, is what holds on the native path.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { user: _user, ...rest } = event;
  return {
    ...rest,
    ...(rest.message === undefined ? {} : { message: scrub(rest.message) }),
    ...(rest.request === undefined
      ? {}
      : {
          request: {
            ...rest.request,
            ...(rest.request.url === undefined
              ? {}
              : { url: scrubUrl(rest.request.url) }),
            ...(rest.request.headers === undefined
              ? {}
              : {
                  headers: Object.fromEntries(
                    Object.entries(rest.request.headers).map(
                      ([name, value]) => [name, scrubUrl(value)],
                    ),
                  ),
                }),
          },
        }),
    ...(rest.exception?.values === undefined
      ? {}
      : {
          exception: {
            ...rest.exception,
            values: rest.exception.values.map((value) => ({
              ...value,
              ...(value.value === undefined
                ? {}
                : { value: scrub(value.value) }),
            })),
          },
        }),
    ...(rest.contexts?.app === undefined
      ? {}
      : {
          contexts: {
            ...rest.contexts,
            app: withoutDeviceHash(rest.contexts.app),
          },
        }),
  };
}

/** What kind of build is reporting. */
export interface BuildKind {
  /** `__DEV__`: a development build. */
  readonly dev: boolean;
  /** `EXPO_PUBLIC_CRASH_TEST=1`: a build made to crash on purpose. */
  readonly crashTest: boolean;
}

/**
 * Where a build's reports are filed. A crash-test build is a release
 * build (`__DEV__` is false), and the crashes it exists to cause must not
 * count against production's crash-free sessions, so it has its own.
 */
export function environmentOf({ dev, crashTest }: BuildKind): string {
  if (crashTest) return 'crash-test';
  return dev ? 'development' : 'production';
}

/**
 * What `Sentry.init` is given. The same object, minus the callback, is
 * handed to the native iOS SDK, whose own crash reports are written and
 * sent natively and never pass through `scrubEvent`. So what has to hold
 * on both paths is set here, as an option both SDKs read:
 * - `maxBreadcrumbs: 0`: the native SDK records every network request
 *   as a breadcrumb, and Supabase URLs carry account and match ids;
 *   none are kept, on either side. Raising it brings them back on the
 *   native path, where no hook reaches.
 * - `sendDefaultPii: false`: no IP inference requested, no user details.
 * - no screenshots, no view hierarchy, no tracing, no replays, no
 *   failed-request events (each would be something else to name).
 * What is left on a native report is the crash, the device and OS, the
 * locale and time zone, the app version, and the random installation id
 * the SDK makes per install — which the notice names.
 */
export function crashReportingOptions(
  dsn: string,
  build: BuildKind,
): ReactNativeOptions {
  return {
    dsn,
    environment: environmentOf(build),
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    enableAutoSessionTracking: true,
    enableCaptureFailedRequests: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend: scrubEvent,
  };
}
