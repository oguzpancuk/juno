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
- **EU only, by the DSN's shape.** `lib/crash-rules.ts`
  `sentryDsnSchema` accepts `…@o<org>.ingest.de.sentry.io/<project>` (or
  a stand-in on this machine), so a project created in the US region
  fails the build instead of making the notice false.
- **Nothing that identifies the member leaves the device.**
  `sendDefaultPii: false` (the SDK then tells Sentry never to infer an
  IP), no user is ever set and any is removed, account/match/message ids
  and e-mail addresses are replaced in every message, exception, URL and
  header, and only navigation breadcrumbs are kept (touch and click ones
  carry labels with people's names). Tracing, replays, screenshots and
  the view hierarchy are off. On the project, "Prevent Storing of IP
  Addresses" is on before a DSN is set.
- **Named in the notice in the same change** (`lib/legal.ts`, version
  2026-10-01, all three languages), with a test that checks the notice
  against the dependency list.
- **The forced crash is a route**, `/crash-test`, that throws during
  render when the build sets `EXPO_PUBLIC_CRASH_TEST=1` and sends
  everyone home otherwise: on the web anyone can type the address.
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
