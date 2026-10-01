# Payments setup (the owner's steps)

What has to exist outside this repo before a purchase can reach the
server. ADR-0015 has the reasons; this is only the order of the clicks.
Nothing here is done from a cloud thread.

## 1. The server side (after the PR 1 deploy)

1. Deploy as usual through /deploy-checklist: `npx supabase db push`
   (creates `entitlements`, enables pg_cron, schedules the sweep) and
   `npx supabase functions deploy` (adds `revenuecat-webhook`; config.toml
   turns its JWT check off).
2. Pick a long random value for the webhook's Authorization header, for
   example `Bearer ` followed by the output of `openssl rand -hex 32`, and
   give it to the hosted function:
   `npx supabase secrets set REVENUECAT_WEBHOOK_AUTH='Bearer …'`.
   The function's built-in `Bearer local-stack-only` applies only inside
   the CLI's local stack; on the hosted project an unset secret refuses
   every call.
3. Until this secret is set, the hosted function answers every call with
   500 and RevenueCat keeps retrying; nothing is written.

## 2. RevenueCat

1. Create the project and an iOS app with bundle id `com.oguzpancuk.juno`.
2. Give RevenueCat the App Store Connect In-App Purchase key and the App
   Store Connect API key it asks for.
3. Entitlements → create one with the identifier **`premium`** (exactly
   that; the database ignores every other entitlement) and attach the
   subscription products to it.
4. Integrations → Webhooks → add one:
   - URL: `https://jkxuhbuuhsumyjmlskls.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: the same value as step 1.2.
   - Environment: both sandbox and production (App Review buys in the
     sandbox).
5. "Send test event": the function answers 200 with
   `{"outcome":"ignored: test event"}`. A 401 means the two values differ.

## 3. Apple (App Store Connect)

1. Agreements, Tax, and Banking: the Paid Apps agreement, bank account and
   tax forms.
2. The app record for `com.oguzpancuk.juno`, a subscription group, and the
   products with prices and localized names (Turkish, English, Spanish).
3. Optional: the Small Business Program (15% instead of 30%).
4. Users and Access → Sandbox → test accounts.
5. The first subscription is submitted for review together with a build
   (TestFlight first).

## Local

The local stack sets no secret. Inside it (the runtime reaches the gateway
as `http://kong:8000`) the function falls back to its own
`LOCAL_STACK_AUTH`, `Bearer local-stack-only`, and
`supabase/tests/payments.test.ts` reads that constant from the function's
source. Not in `supabase/functions/.env` (where real local secrets go; it
stays ignored) and not in `[edge_runtime.secrets]`: `supabase secrets set`
pushes every entry of that table to the hosted project, whatever name it
was asked to set.
