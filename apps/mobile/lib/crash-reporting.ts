import * as Sentry from '@sentry/react-native';
import { crashReportingOptions } from './crash-rules';
import { env } from './env';

/**
 * Crash reporting, through Sentry's EU region: the ROADMAP's Metrics item
 * names it, and the owner chose it on 2026-10-01.
 *
 * Started once, before the first screen, and only when the build carries
 * a DSN. What it sends is the error, the device and OS, the app version,
 * the page on the web, and whether the session ended in a crash — the
 * last is what the PRD's crash-free sessions are counted from. What
 * it must not send is held in `lib/crash-rules.ts` and named in the
 * privacy notice (`lib/legal.ts`), on the JS path and the native one.
 */
export function startCrashReporting(): void {
  if (!env.sentryDsn) return;
  Sentry.init(crashReportingOptions(env.sentryDsn, __DEV__));
}
