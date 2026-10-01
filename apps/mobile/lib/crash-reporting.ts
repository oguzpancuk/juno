import * as Sentry from '@sentry/react-native';
import { keepBreadcrumb, scrubEvent } from './crash-rules';
import { env } from './env';

/**
 * Crash reporting, through Sentry's EU region: the ROADMAP's Metrics item
 * names it, and the owner chose it on 2026-10-01.
 *
 * Started once, before the first screen, and only when the build carries
 * a DSN. What it sends is the error, the device and OS, the app version,
 * the route it happened on, and whether the session ended in a crash —
 * the last is what the PRD's crash-free sessions are counted from. What
 * it must not send is held in `lib/crash-rules.ts` and named in the
 * privacy notice (`lib/legal.ts`): no user, no ids, no addresses, no
 * breadcrumbs but navigation. Performance tracing, replays, screenshots
 * and the view hierarchy are all off; each would be one more thing the
 * notice has to describe.
 */
export function startCrashReporting(): void {
  if (!env.sentryDsn) return;
  Sentry.init({
    dsn: env.sentryDsn,
    sendDefaultPii: false,
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeBreadcrumb: keepBreadcrumb,
    beforeSend: scrubEvent,
  });
}
