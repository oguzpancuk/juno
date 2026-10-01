import { Redirect } from 'expo-router';
import { env } from '@/lib/env';

/**
 * The ROADMAP's forced test crash: open `/crash-test` (or
 * `juno://crash-test` on the phone) in a build made with
 * `EXPO_PUBLIC_CRASH_TEST=1`, and the app crashes during render with an
 * error Sentry should show within a minute. Every other build sends the
 * visitor home: on the web anyone can type the address, and a crash on
 * demand would count against the crash-free figure it is meant to check.
 */
export default function CrashTest() {
  if (!env.crashTest) return <Redirect href="/" />;
  throw new Error('Juno crash test (EXPO_PUBLIC_CRASH_TEST)');
}
