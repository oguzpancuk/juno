import type {
  Breadcrumb,
  ErrorEvent,
  ReactNativeOptions,
} from '@sentry/react-native';
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

/**
 * A DSN of Sentry's EU region (`o<org>.ingest.de.sentry.io`), or a
 * stand-in on this machine for checking what would be sent. The DSN is
 * public by design — it can only send — but the auth token is a secret,
 * and a token pasted here would ship to every phone, so the shape is
 * exact.
 */
export const sentryDsnSchema = z
  .string()
  .regex(
    /^(https:\/\/[0-9a-f]{32}@o\d+\.ingest\.de\.sentry\.io|http:\/\/[0-9a-f]{32}@(127\.0\.0\.1|localhost):\d+)\/\d+$/u,
    'a Sentry DSN in the EU region (…ingest.de.sentry.io)',
  );

/** `EXPO_PUBLIC_CRASH_TEST=1` opens `/crash-test`; anything else keeps it shut. */
export const crashTestSchema = z
  .string()
  .optional()
  .transform((value) => value === '1');

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu;
const EMAIL = /[^\s@()<>"',;:]+@[^\s@()<>"',;:]+\.[a-z]{2,}/giu;

/** Account, match and message ids, and e-mail addresses, replaced. */
export function scrub(text: string): string {
  return text.replace(UUID, '<id>').replace(EMAIL, '<email>');
}

function scrubValues(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === 'string' ? scrub(value) : value,
    ]),
  );
}

/**
 * Only where the app went. Touch and click breadcrumbs carry what was on
 * the control ("Selin'i beğen"), console ones whatever was logged, request
 * ones URLs with ids in their query strings.
 */
export function keepBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category !== 'navigation') return null;
  return {
    ...breadcrumb,
    ...(breadcrumb.message === undefined
      ? {}
      : { message: scrub(breadcrumb.message) }),
    ...(breadcrumb.data === undefined
      ? {}
      : { data: scrubValues(breadcrumb.data) }),
  };
}

/** The event as it may leave the device: no user, no ids, no addresses. */
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
              : { url: scrub(rest.request.url) }),
            ...(rest.request.headers === undefined
              ? {}
              : {
                  headers: Object.fromEntries(
                    Object.entries(rest.request.headers).map(
                      ([name, value]) => [name, scrub(value)],
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
    ...(rest.breadcrumbs === undefined
      ? {}
      : {
          breadcrumbs: rest.breadcrumbs.flatMap((crumb) => {
            const kept = keepBreadcrumb(crumb);
            return kept ? [kept] : [];
          }),
        }),
  };
}

/**
 * What `Sentry.init` is given. The same object, minus the two callbacks,
 * is handed to the native iOS SDK, whose own crash reports are written
 * and sent natively and never pass through `scrubEvent` or
 * `keepBreadcrumb`. So what has to hold on both paths is set here, as an
 * option both SDKs read:
 * - `maxBreadcrumbs: 0`: the native SDK records every network request
 *   as a breadcrumb, and Supabase URLs carry account and match ids;
 *   none are kept, on either side.
 * - `sendDefaultPii: false`: no IP inference requested, no user details.
 * - no screenshots, no view hierarchy, no tracing, no replays, no
 *   failed-request events (each would be something else to name).
 * What is left on a native report is the crash, the device and OS, the
 * locale and time zone, the app version, and the random installation id
 * the SDK makes per install — which the notice names.
 */
export function crashReportingOptions(
  dsn: string,
  dev: boolean,
): ReactNativeOptions {
  return {
    dsn,
    environment: dev ? 'development' : 'production',
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    enableAutoSessionTracking: true,
    enableCaptureFailedRequests: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeBreadcrumb: keepBreadcrumb,
    beforeSend: scrubEvent,
  };
}
