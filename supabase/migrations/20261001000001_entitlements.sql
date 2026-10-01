-- Premium bought through the App Store, the server's side (payments plan,
-- PR 1 of 4; docs/adr/0015-payments.md). RevenueCat verifies the receipt
-- with Apple and tells us what happened through a webhook; the
-- `revenuecat-webhook` Edge Function checks that the call is RevenueCat's
-- and hands the event to `public.apply_revenuecat_event` below, which
-- keeps one row per member saying until when they have paid.
--
-- What this does NOT change yet: `profiles.is_premium` stays in the
-- member's own update grant, so today's free "Premium ol" keeps working
-- until the purchase screen replaces it (the migration PR, 3 of 4, takes
-- the column out of the grant). The quotas and `liked_me` are untouched:
-- they read the flag, and this table is one more thing that writes it.
--
-- Reversible in one commit: a new table, three functions, one trigger and
-- one cron job, none of which rewrites an existing row.

-- ---------------------------------------------------------------- table
/**
 * One row per member who has ever bought premium: the latest word from
 * the store about until when it is paid for.
 *
 * Keyed on the member, not on the transaction: the app sells one
 * entitlement ("premium"), RevenueCat already folds a member's renewals,
 * upgrades and restores into it, and every rule here asks one question —
 * is this member paid up right now.
 *
 * `active` is what this table last told `profiles.is_premium`. It is kept
 * rather than derived so the flag only moves when the purchase changes
 * state: a member whose purchase lapsed and who then taps today's free
 * "Premium ol" is not knocked back down every five minutes by the sweep.
 *
 * References auth.users, not profiles, for the cascade: deleting an
 * account removes the purchase record with it (Apple keeps billing until
 * the member cancels in iOS Settings; the delete screen will say so,
 * PR 3 of 4).
 */
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  product_id text not null,
  store text not null,
  -- App Review buys in the sandbox against the production app, so a
  -- sandbox purchase has to unlock premium too; it is recorded, not
  -- refused.
  environment text not null check (environment in ('SANDBOX', 'PRODUCTION')),
  original_transaction_id text,
  expires_at timestamptz not null,
  active boolean not null,
  -- The last event applied. Webhooks arrive late, twice and out of order;
  -- an event older than this one changes nothing.
  last_event_id text not null,
  last_event_type text not null,
  last_event_at timestamptz not null,
  updated_at timestamptz not null default now()
);

comment on table public.entitlements is
  'Premium bought in the App Store, as RevenueCat last reported it. '
  'Written only by public.apply_revenuecat_event (service role); a member '
  'reads their own row.';

-- The sweep below asks for rows still marked active whose time is up.
create index entitlements_active_expires_at_idx
  on public.entitlements (expires_at) where active;

alter table public.entitlements enable row level security;

-- Supabase's default privileges hand every new public table to anon and
-- authenticated in full; a member reads their own row and writes nothing.
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;

create policy "entitlements: read own"
  on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------- flag
/**
 * Carries the purchase onto `profiles.is_premium`, which is what the
 * quotas, `liked_me` and the app read (ADR-0012: every rule runs on the
 * flag, not on how it got there). Only when `active` changes, for the
 * reason given on the table. `premium_since` follows by its own trigger.
 *
 * Invoker: its two callers are definer functions below, which run as the
 * owner, and the service role.
 */
create or replace function private.entitlements_sync_premium()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.active is distinct from old.active then
    update public.profiles
       set is_premium = new.active
     where id = new.user_id
       and is_premium is distinct from new.active;
  end if;
  return null;
end;
$$;

create trigger entitlements_sync_premium
  after insert or update of active on public.entitlements
  for each row execute function private.entitlements_sync_premium();

revoke all on function private.entitlements_sync_premium() from public, anon, authenticated;

-- --------------------------------------------------------------- events
/**
 * A RevenueCat app user id, if it is one of ours. The app logs in to
 * RevenueCat with the Supabase user id (PR 2 of 4); anything else — an
 * anonymous `$RCAnonymousID:…` from before sign-in — names nobody here.
 */
create or replace function private.revenuecat_member(app_user_id text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when app_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then app_user_id::uuid
  end;
$$;

revoke all on function private.revenuecat_member(text) from public, anon, authenticated;

/**
 * Applies one RevenueCat webhook event and says what it did: 'applied',
 * 'stale' (an older event than the one already applied), or
 * 'ignored: <why>'. Never raises for an event it does not want: the
 * webhook answers 200 either way, and RevenueCat retries only what failed.
 *
 * `event` is RevenueCat's `event` object as the Edge Function validated
 * it (field names are RevenueCat's own). The rules:
 *
 *   - Only the "premium" entitlement counts. The RevenueCat project must
 *     name it exactly that (docs/payments-setup.md).
 *   - Paid-until is the event's expiry, or the end of Apple's billing
 *     grace period when that is later — RevenueCat keeps the entitlement
 *     through it, and so do we.
 *   - A refund (CANCELLATION with cancel_reason CUSTOMER_SUPPORT) ends it
 *     at the moment of the event. A plain CANCELLATION is auto-renew
 *     switched off: paid-until stays, the member keeps what they paid for.
 *   - TRANSFER (a restore on another account) moves the purchase: the
 *     accounts it leaves lose it now, the account it reaches gets it.
 *   - An event with no expiry is a lifetime purchase, which v1 does not
 *     sell; it is ignored rather than turned into premium forever.
 *
 * Definer, so the webhook needs nothing but EXECUTE: the table has no
 * write grant at all. EXECUTE is the service role's alone.
 */
create or replace function public.apply_revenuecat_event(event jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind text := event ->> 'type';
  event_id text := event ->> 'id';
  event_at timestamptz;
  member uuid;
  ends timestamptz;
  source public.entitlements%rowtype;
  leaving uuid[];
  written integer;
begin
  if kind is null or event_id is null or event ->> 'event_timestamp_ms' is null then
    return 'ignored: incomplete';
  end if;
  event_at := pg_catalog.to_timestamp((event ->> 'event_timestamp_ms')::double precision / 1000);

  if kind = 'TEST' then
    return 'ignored: test event';
  end if;

  if kind = 'TRANSFER' then
    select coalesce(array_agg(m), '{}') into leaving
      from (
        select private.revenuecat_member(x) as m
          from jsonb_array_elements_text(coalesce(event -> 'transferred_from', '[]')) as x
      ) ids
     where m is not null;
    select e.* into source
      from public.entitlements e
     where e.user_id = any (leaving)
       and e.last_event_at <= event_at
     order by e.expires_at desc
     limit 1
       for update;
    if not found then
      return 'ignored: nothing to transfer';
    end if;
    update public.entitlements
       set expires_at = least(expires_at, event_at),
           active = false,
           last_event_id = event_id,
           last_event_type = kind,
           last_event_at = event_at,
           updated_at = now()
     where user_id = any (leaving)
       and last_event_at <= event_at;
    select m into member
      from (
        select private.revenuecat_member(x) as m, n
          from jsonb_array_elements_text(coalesce(event -> 'transferred_to', '[]'))
               with ordinality as t (x, n)
      ) ids
     where m is not null
       and exists (select 1 from public.profiles p where p.id = m)
     order by n
     limit 1;
    if member is null then
      return 'applied';
    end if;
    insert into public.entitlements as e (
      user_id, product_id, store, environment, original_transaction_id,
      expires_at, active, last_event_id, last_event_type, last_event_at
    ) values (
      member, source.product_id, source.store, source.environment,
      source.original_transaction_id, source.expires_at,
      source.expires_at > now(), event_id, kind, event_at
    )
    on conflict (user_id) do update
      set product_id = excluded.product_id,
          store = excluded.store,
          environment = excluded.environment,
          original_transaction_id = excluded.original_transaction_id,
          expires_at = greatest(e.expires_at, excluded.expires_at),
          active = greatest(e.expires_at, excluded.expires_at) > now(),
          last_event_id = excluded.last_event_id,
          last_event_type = excluded.last_event_type,
          last_event_at = excluded.last_event_at,
          updated_at = now()
      where e.last_event_at <= excluded.last_event_at;
    return 'applied';
  end if;

  if kind not in (
    'INITIAL_PURCHASE', 'RENEWAL', 'CANCELLATION', 'UNCANCELLATION',
    'NON_RENEWING_PURCHASE', 'EXPIRATION', 'BILLING_ISSUE',
    'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT', 'REFUND_REVERSED'
  ) then
    return 'ignored: ' || kind;
  end if;
  if not coalesce(event -> 'entitlement_ids' ? 'premium', false) then
    return 'ignored: not premium';
  end if;
  member := private.revenuecat_member(event ->> 'app_user_id');
  if member is null or not exists (select 1 from public.profiles p where p.id = member) then
    return 'ignored: unknown member';
  end if;
  if event ->> 'product_id' is null
     or event ->> 'store' is null
     or event ->> 'environment' is null then
    return 'ignored: incomplete';
  end if;
  -- greatest() skips nulls, so either one is enough and both is the later.
  ends := greatest(
    pg_catalog.to_timestamp((event ->> 'expiration_at_ms')::double precision / 1000),
    pg_catalog.to_timestamp((event ->> 'grace_period_expiration_at_ms')::double precision / 1000)
  );
  if ends is null then
    return 'ignored: no expiry';
  end if;
  if kind = 'CANCELLATION' and event ->> 'cancel_reason' = 'CUSTOMER_SUPPORT' then
    ends := least(ends, event_at);
  end if;

  insert into public.entitlements as e (
    user_id, product_id, store, environment, original_transaction_id,
    expires_at, active, last_event_id, last_event_type, last_event_at
  ) values (
    member, event ->> 'product_id', event ->> 'store', event ->> 'environment',
    event ->> 'original_transaction_id', ends, ends > now(),
    event_id, kind, event_at
  )
  on conflict (user_id) do update
    set product_id = excluded.product_id,
        store = excluded.store,
        environment = excluded.environment,
        original_transaction_id = excluded.original_transaction_id,
        expires_at = excluded.expires_at,
        active = excluded.active,
        last_event_id = excluded.last_event_id,
        last_event_type = excluded.last_event_type,
        last_event_at = excluded.last_event_at,
        updated_at = now()
    -- Equal is applied again on purpose: a retried delivery is the same
    -- event and writes the same values.
    where e.last_event_at <= excluded.last_event_at;
  get diagnostics written = row_count;
  if written = 0 then
    return 'stale';
  end if;
  return 'applied';
end;
$$;

revoke all on function public.apply_revenuecat_event(jsonb) from public, anon, authenticated;
grant execute on function public.apply_revenuecat_event(jsonb) to service_role;

-- ---------------------------------------------------------------- sweep
/**
 * Ends what has run out. A webhook can be lost — RevenueCat gives up after
 * a few retries, and the function can be down — and a lost EXPIRATION must
 * not leave anyone premium for ever. Returns how many it ended.
 *
 * Run every five minutes by pg_cron below, so a lapse is late by at most
 * that. EXECUTE is the service role's: the test suite calls it to avoid
 * waiting on the clock.
 */
create or replace function public.expire_entitlements()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ended integer;
begin
  update public.entitlements
     set active = false,
         updated_at = now()
   where active
     and expires_at <= now();
  get diagnostics ended = row_count;
  return ended;
end;
$$;

revoke all on function public.expire_entitlements() from public, anon, authenticated;
grant execute on function public.expire_entitlements() to service_role;

-- pg_cron is not relocatable and lives in pg_catalog; Supabase ships it
-- preloaded, locally and hosted. `cron.schedule` with a name replaces a
-- job of the same name, so re-running this is harmless.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-entitlements',
  '*/5 * * * *',
  'select public.expire_entitlements()'
);
