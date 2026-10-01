# 15. Payments: App Store subscriptions through RevenueCat, the entitlement on the server

Date: 2026-10-01

## Status

Accepted. The owner chose this on 2026-10-01 ("1": pull payments forward,
with RevenueCat) after reading the plan of the same day. This pull request
is the first of four and carries the server side only.

## Context

Premium has existed since PR #10 (ADR-0012) with nothing behind the
counter: `profiles.is_premium` is in the member's own update grant and
"Premium ol" is one write. ADR-0012 said what changes when a payment step
lands — the flag leaves the grant and a function that has a receipt to
check writes it — and that nothing else has to move, because every rule
(the like quotas, `liked_me`, the deck badge) runs on the flag.

On iOS a digital subscription has to be sold through Apple's in-app
purchase. The choice was between RevenueCat (`react-native-purchases`:
receipt validation, renewal and refund state, one webhook), an open-source
StoreKit bridge with our own validation and App Store Server
Notifications V2, or a StoreKit 2 module of our own. RevenueCat brings the
riskiest part — validation and the renewal state machine — ready and
tested, at the cost of a third-party processor named in the privacy notice.

## Decision

1. **RevenueCat, App Store only in v1.** No web sales: Apple's purchase
   does not run in a browser, Stripe does not open accounts for Turkish
   merchants, and a second provider is a second webhook, refund flow and
   processor. The web shows the membership the server holds and says it is
   bought in the iPhone app.
2. **The entitlement is the server's.** `public.entitlements` keeps one row
   per member: product, store, environment, paid-until (`expires_at`) and
   the last event applied. Only `public.apply_revenuecat_event` writes it,
   and only the service role may call that; a member reads their own row.
   The client saying "I bought it" unlocks nothing.
3. **The webhook proves the caller, the database applies the rules.** The
   `revenuecat-webhook` Edge Function compares the Authorization header
   with `REVENUECAT_WEBHOOK_AUTH` (a secret in the function's env; without
   it the function refuses every call), validates the event with Zod,
   drops every field the rules do not read, and calls the function. The
   rules live in SQL so that ordering and the two-account write of a
   transfer happen in one transaction:
   - only the `premium` entitlement counts;
   - paid-until is the event's expiry, or the end of Apple's billing grace
     period when later;
   - a refund (`CANCELLATION` with `cancel_reason` `CUSTOMER_SUPPORT`) ends
     it at the event's time; switching auto-renew off does not;
   - `TRANSFER` (a restore on another account) moves it;
   - an event older than the one last applied changes nothing, and a
     retried delivery writes the same values again;
   - an event with no expiry (a lifetime purchase, not sold in v1) is
     ignored rather than turned into premium for ever;
   - events the app has no use for are answered 200 with the reason, so
     RevenueCat only retries what actually failed on our side.
4. **Sandbox purchases count.** App Review buys in the sandbox against the
   production app; refusing sandbox there would fail review. The
   environment is recorded on the row.
5. **Expiry does not depend on a webhook arriving.** A pg_cron job runs
   `public.expire_entitlements()` every five minutes. The row keeps
   `active` — what it last told the profile — so the flag moves only when
   the purchase changes state, and the profile's `is_premium` follows by
   trigger.
6. **Four pull requests.** (1) This one: table, webhook, sweep, tests; the
   member's `is_premium` grant stays, so today's free tap keeps working
   until there is something to buy. (2) The app: subscription screen in
   three languages (price and period, auto-renewal, how to cancel, terms
   and privacy links, Restore, Manage subscription), purchase through
   RevenueCat logged in with the Supabase user id; RevenueCat and the
   purchase record enter the privacy notice here, because this is the
   change that puts them in the path (CLAUDE.md). (3) The switch:
   `is_premium` leaves the update grant, today's self-granted members are
   moved as the owner decides, `LEGAL_VERSION` advances, and the delete
   screen says the subscription is cancelled in iOS Settings. (4) The web
   screen.

## Consequences

Until PR 3, `is_premium` has two writers: the member (the free tap) and
the purchase. A purchase that starts or ends sets the flag; between those
moments the member can still flip it, which is today's behaviour and
changes nothing anyone pays for, because nothing can be paid for until
PR 2.

The RevenueCat project must name its entitlement `premium` and send the
webhook with the same Authorization value the hosted function holds;
`docs/payments-setup.md` has the steps. Both are the owner's, with the
Apple side (Paid Apps agreement, bank and tax, products, sandbox testers),
and the first subscription product is reviewed together with a build, so
the item sits after TestFlight in the ROADMAP.

Deleting an account deletes its `entitlements` row by cascade from
`auth.users`. Apple keeps billing a subscription until the member cancels
it in iOS Settings; App Store guideline 5.1.1(v) wants the delete screen
to say so, which is PR 3.

Enabling pg_cron is new infrastructure in the hosted database, inside
Postgres; it carries no personal data off the server.
