# 10. Messages carry their recipient, so live subscriptions can filter on it

Date: 2026-09-16

## Status

Accepted (owner, 2026-09-16, choosing option 1 of three)

## Context

The Eşleşmeler tab shows a badge with the number of unread messages
across every thread. To keep it current without polling, each signed-in
device subscribes to Realtime `postgres_changes` on `messages`: an insert
may be a message to them, an update may be them marking one read.

The first version subscribed to the whole table, relying on RLS to deliver
only the rows of the person's own matches. A code review of 2026-09-15
pointed out the cost of that, and it was measured on the local stack
(Realtime v2.130.0, whose change pipeline is the SQL function
`realtime.apply_rls`; `docs/NOTES.md`, 2026-09-15, "review fixes, second
round"):

- For every change, Realtime walks every subscription on the table and,
  for each whose filter admits the row, runs that subscriber's RLS check
  (`private.match_open`, a lookup on `matches` and `blocks`). A
  subscription with no filter admits every row, so each message cost one
  RLS check per person online — 2000 fake unfiltered subscribers produced
  2000 `match_open` calls for one change.
- A filter is evaluated before RLS, and a subscription it rules out costs
  no RLS check at all.

Three ways to give the badge a filter were weighed:

1. A `recipient_id` column on `messages`, subscribed with
   `recipient_id=eq.<me>`. The cheapest filter measured; one subscription
   per device whatever the number of matches; a new match's first message
   needs nothing extra.
2. An `in` filter over the person's own match ids, with no schema change.
   Measured to work, but the filter check itself cost about as much as
   RLS at 50 ids, a list of more than 69 uuids fails on Realtime's own
   index on this stack (the documented limit is 100), the subscription has
   to be rebuilt whenever the set of matches changes, and a failing
   subscription delayed or dropped events for other channels on the same
   socket.
3. Leave it until before launch.

## Decision

`messages.recipient_id` (migration `20260916000001_message_recipient.sql`):

- Filled by the server on insert from the match — the member who is not
  the sender — by a security-definer trigger; a value sent by the client is
  overwritten, so a message can only ever be addressed to the other member.
- Frozen afterwards alongside the other columns in `forbid_message_edit`.
- Required by a check constraint rather than `NOT NULL`, so the generated
  types do not ask every insert to name a recipient the server will set
  anyway.
- Existing rows are backfilled from their match in the same migration.

The badge (`apps/mobile/lib/unread.ts`) subscribes to inserts and updates
filtered by `recipient_id=eq.<the signed-in user>`. RLS is unchanged and
still decides delivery: naming someone else's id in the filter receives
nothing (`supabase/tests/realtime.test.ts`).

## Consequences

- One Realtime RLS check per message for the badge — the recipient's —
  instead of one per person online. Realtime still evaluates each
  subscription's filter for every change on the table; an `eq` filter is
  the cheapest form of that.
- The column widens no one's view: a member could already tell who the
  other side of their match is.
- The chat thread keeps its `match_id=eq.` subscription.
- The migration reaches the hosted database with the first
  `npx supabase db push`, which is ask-tier. **Order matters**: the
  database first, then any app build or update carrying the filtered
  badge. A subscription whose filter names a column the server does not
  have is refused: on the local stack (Realtime v2.130.0), inserting such
  a subscription raises `invalid column for filter <name>` from
  `realtime.subscription_check_filters()`, checked in a rolled-back
  transaction on 2026-09-16. That the refusal also disturbs the other
  channels on the same socket — the chat thread's among them — is
  inferred, not measured: what was measured is the one failing
  subscription of `docs/NOTES.md`, 2026-09-15, "review fixes, second
  round", an `in` filter over more ids than Realtime's index accepts.
- The figures in this ADR come from the local stack; the hosted Realtime
  version may differ and is worth rechecking at the first deploy.
