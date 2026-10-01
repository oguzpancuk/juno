# 16. Crash reporting: Sentry's EU region, nothing that says who you are

Date: 2026-10-01

## Status

Accepted

## Context

The ROADMAP's Metrics item asks for crash reporting ("Sentry via
`@sentry/react-native`"; done when a forced test crash appears in
Sentry), and the PRD's stability signal is crash-free sessions on
TestFlight, which is a figure Sentry counts. A crash reporter is a new
processor of personal data and a new dependency, both of which the
project instructions put to the owner. Asked with three options
(Sentry EU, Firebase Crashlytics, wait until TestFlight), the owner
chose Sentry EU on 2026-10-01. ADR 0015 is the payments thread's.

## Decision

- **`@sentry/react-native` ~7.11.0**, the version Expo 57's
  `bundledNativeModules.json` names. Started in `app/_layout.tsx` before
  the first render, and only when the build carries
  `EXPO_PUBLIC_SENTRY_DSN`; without one the app reports nothing and is
  otherwise the same, which is what local work and the test runs are.
- **EU only, by the DSN's shape, checked at deploy.** `npm run deploy`
  (`scripts/check-deploy-env.ts`, `lib/deploy-target.ts`
  `checkCrashReporting`) refuses a DSN that is not
  `…@o<org>.ingest.de.sentry.io/<project>`, so a project created in the
  US region, or a leftover stand-in on this machine, stops the deploy
  instead of making the notice false. The app itself reads a DSN of the
  wrong shape as "no reporting" (`reportingDsnSchema`) rather than
  refusing to start: a startup failure would blank the app for every
  visitor, with Sentry not yet running to see it. EAS builds do not pass
  through that gate yet (no EAS project exists); the TestFlight item adds
  the same check there.
- **Nothing that names the member is sent, on either SDK.** The options
  (`crashReportingOptions`) reach the native iOS SDK too, minus the
  callbacks, and the native SDK's own crash reports never pass through
  the JS `beforeSend`. So what must hold on both paths is an option both
  read: `maxBreadcrumbs: 0` (the native SDK otherwise records every
  network request, and Supabase URLs carry account and match ids),
  `sendDefaultPii: false` (the JS SDK then tells Sentry never to infer an
  IP), no screenshots, view hierarchy, tracing, replays or failed-request
  events. On the JS path, `scrubEvent` also removes the user, cuts URLs
  (the page and the `Referer`) down to origin and path, and replaces
  tokens, ids and e-mail addresses in messages and exceptions. The cut is
  for the web's sign-in: Google and Apple come back to
  `/#access_token=…&refresh_token=…`, and supabase-js clears that
  fragment only after a round trip, so an error in the first render
  would otherwise carry a live session. The
  native SDK puts two numbers on its reports: a random installation id
  as `user.id`, and `contexts.app.device_app_hash`, a one-way hash of
  Apple's `identifierForVendor`, the model and the bundle id. Neither is
  the account; `scrubEvent` drops the hash from JS events, no hook
  reaches native ones, and the notice names both. On the project, "Prevent Storing of IP Addresses" is on before a
  DSN is set.
- **Named in the notice in the same change** (`lib/legal.ts`, version
  2026-10-01, all three languages), with a test that checks the notice
  against the dependency list.
- **The forced crash is a route**, `/crash-test`, that throws during
  render when the build sets `EXPO_PUBLIC_CRASH_TEST=1` and sends
  everyone home otherwise: on the web anyone can type the address. Such a
  build reports to the `crash-test` environment, so its crashes stay out
  of production's crash-free sessions, and `npm run deploy` refuses it.
- **No Expo config plugin yet.** It adds build phases that upload source
  maps and debug symbols with an auth token, which is a secret, and no
  EAS project exists. Without it crashes are reported with minified JS
  frames. Adding the plugin and the token is a TestFlight-item step.

## Consequences

- Moving `LEGAL_VERSION` asks every member to accept the notice again.
- A crash-test build and a normal build made one after the other on the
  same machine must not share Metro's cache: an `expo export` without
  `--clear` was seen reusing the earlier build's `EXPO_PUBLIC_*` values.
  `npm run deploy` already passes `--clear`.
- Reports are kept for the plan's retention (30 days free, 90 on Team);
  the notice says 90 at most, so a plan with longer retention changes
  the notice first.
