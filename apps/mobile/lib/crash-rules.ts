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
  .catch(() => {
    // Said, not thrown, so a crash-test or TestFlight build that reports
    // nothing shows why. The value itself is not printed: the shape check
    // exists because a secret (the auth token) can end up here.
    console.warn(
      'EXPO_PUBLIC_SENTRY_DSN is set but is not a Sentry DSN in the EU region (…ingest.de.sentry.io); crash reporting is off.',
    );
    return undefined;
  });

/** `EXPO_PUBLIC_CRASH_TEST=1` opens `/crash-test`; anything else keeps it shut. */
export const crashTestSchema = z
  .string()
  .optional()
  .transform((value) => value === '1');

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu;
const EMAIL = /[^\s@()<>"',;:]+@[^\s@()<>"',;:]+\.[a-z]{2,}/giu;
/** A JWT: a session's access token, or a signed photo URL's `token`. */
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]*/gu;
/**
 * Any `…token` named with its value: `refresh_token=…` in a URL,
 * `"refresh_token":"…"` in serialized JSON. Supabase refresh tokens are
 * short random strings, not JWTs, so only their name gives them away.
 */
const NAMED_TOKEN = /("?\b[a-z_]*token"?\s*[:=]\s*"?)[^"&#\s,;}']+/giu;
/** `Authorization: Bearer …`, for a token that is not a JWT. */
const BEARER = /\b(bearer\s+)[^\s"',;}]+/giu;

/**
 * Account, match and message ids, e-mail addresses and tokens, replaced.
 * Tokens go first: a JWT's payload is the account id and the e-mail
 * address in base64, which the later patterns cannot see. Error codes
 * (`code=23505`) stay: they tell reports apart and name no one.
 */
export function scrub(text: string): string {
  return text
    .replace(JWT, '<token>')
    .replace(NAMED_TOKEN, '$1<token>')
    .replace(BEARER, '$1<token>')
    .replace(UUID, '<id>')
    .replace(EMAIL, '<email>');
}

/**
 * A URL as a report may carry it: everything from the first `?` or `#`
 * dropped, the rest scrubbed. On the web a Google or Apple sign-in comes
 * back as `/#access_token=…&refresh_token=…`, and supabase-js clears that
 * only after a round trip, so an error in the first render would
 * otherwise send a live session; a query can carry a signed photo's
 * token. Cut as text rather than parsed, because the RN SDK rewrites
 * frame file names to `app:///…`, a scheme `URL` gives no origin.
 */
export function scrubUrl(value: string): string {
  return scrub(value.replace(/[?#].*$/su, ''));
}

/** Every string in a value, scrubbed; objects and arrays walked. */
function scrubAll(value: unknown): unknown {
  if (typeof value === 'string') return scrub(value);
  if (Array.isArray(value)) return value.map(scrubAll);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, scrubAll(entry)]),
    );
  return value;
}

/**
 * A stack frame with its file cut like a URL. On the web, an error with
 * no script URL gets a first frame whose `filename` is `location.href`,
 * sign-in fragment included.
 */
function scrubFrame<T extends { filename?: string; abs_path?: string }>(
  frame: T,
): T {
  return {
    ...frame,
    ...(frame.filename === undefined
      ? {}
      : { filename: scrubUrl(frame.filename) }),
    ...(frame.abs_path === undefined
      ? {}
      : { abs_path: scrubUrl(frame.abs_path) }),
  };
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
 * The event as it may leave the device: no user and no device hash; page
 * URLs, headers and stack-frame files cut at `?` and `#`; and then every
 * string left in it scrubbed of tokens, ids and e-mail addresses, so a
 * field nobody thought of is covered too. Breadcrumbs are not handled
 * here because there are none: `maxBreadcrumbs: 0` (below) stops both
 * SDKs recording them, and that option, not a filter, is what holds on
 * the native path.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { user: _user, ...rest } = event;
  const cut: ErrorEvent = {
    ...rest,
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
              ...(value.stacktrace?.frames === undefined
                ? {}
                : {
                    stacktrace: {
                      ...value.stacktrace,
                      frames: value.stacktrace.frames.map(scrubFrame),
                    },
                  }),
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
  // why: scrubAll keeps the shape and only rewrites strings, so the
  // result is still the event it was given.
  return scrubAll(cut) as ErrorEvent;
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
