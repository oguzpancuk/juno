# 5. Reach users through a web client before the App Store

Date: 2026-09-09

## Status

Accepted

## Context

Getting the app onto a phone the owner does not control needs three
outside accounts: a hosted Supabase project for the backend, an Expo
(EAS) account to build the iOS binary in the cloud, and Apple Developer
Program membership at 99 USD a year for TestFlight and the App Store.
None of them are needed while the app runs against the local stack in a
simulator, and the app name is still undecided, so an App Store record
cannot be created yet either.

The owner's other product, `pati`, solved the same problem without an
App Store: its backend runs on Fly.io and its primary reachable client
is a web PWA, with the React Native app built locally in Xcode. People
use the product from a browser today; TestFlight is still an open item
there.

## Decision

Stardate follows the same order:

1. Finish the v1 list against the local stack.
2. Create the hosted Supabase project (EU region) and push migrations,
   so the app works from a phone off this machine. Free tier.
3. Ship a web client from the same Expo Router codebase, so people can
   use the product without the App Store.
4. Only then EAS and Apple Developer membership, for TestFlight.

The backend stays Supabase (ADR-0002). Moving to a self-hosted Postgres
like pati's would mean rewriting auth, storage and realtime, which the
chat feature already depends on.

## Consequences

- No paid membership until there is something worth testing on real
  devices, and no account is created before the step that needs it.
- Every screen has to work in a browser, which constrains native-only
  choices: device location and notifications need a web equivalent or a
  stated divergence.
- The App Store name decision can wait; the bundle id
  `com.oguzpancuk.stardate` is internal and independent of the
  marketing name.

## Amendment 1 (2026-09-10): the name is Juno, and the bundle id follows it

The last consequence above is stale. The owner settled the product name on
Juno, and since nothing had been published yet, the bundle id moved with
it: `com.oguzpancuk.juno` on both platforms, as `apps/mobile/app.json`
says. The claim that the bundle id is independent of the marketing name
still holds in principle — it is simply no longer worth spending, because
the id was free to change before the first TestFlight build and will not
be after. The same day the owner renamed the working directory and the
GitHub repository to `juno`, so `stardate` is gone from the code as well:
the npm workspace scope is `@juno/*` and the local Supabase project id is
`juno`. Whether "Juno" is available on the App Store is still open for the
first deploy session.
