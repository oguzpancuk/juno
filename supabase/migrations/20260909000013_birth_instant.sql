-- The birth check refused real people, and the consent record could be
-- rewritten backwards.
--
-- 1. The check compared the device's answer with Postgres's, and the two
--    disagree more often than the design assumed: historical offsets with
--    seconds in them (Monrovia until 1972, Riyadh until 1947, Dhaka 1941,
--    Tehran 1935, Paramaribo 1945) which the engine rounds to the minute,
--    and at least one flat one-hour disagreement between zone database
--    versions (Tijuana 1953–1975). A review measured 1476 refused pairs
--    across 21 zones, some of them ordinary mid-month noons. Someone born
--    in Tijuana in 1970 could not create a profile at all, and the app
--    could only tell them their data was invalid.
--
--    The fix is to stop having two answers. `public.birth_instant` gives
--    the client the server's own conversion, which it uses for the chart
--    and stores; the check then compares like with like. The two-way rule
--    stays for the offline fallback, with a minute of tolerance for the
--    rounding, which is far below the hour a stale zone database costs.
--
-- 2. `consent_version` could be set backwards: a member could claim they
--    had accepted a notice from 2020. The stamp was already the server's;
--    the version is now monotonic for the same reason.

/**
 * The instant a wall clock in a city refers to. Definer, because
 * `city_zones` is closed to clients — the app has the same list offline,
 * but its zone database may be years old, and this one is the server's.
 */
create or replace function public.birth_instant(
  city_id integer,
  local_time timestamp without time zone
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  zone text;
begin
  select time_zone into zone from public.city_zones where id = city_id;
  if zone is null then
    raise exception 'unknown birth city' using errcode = 'check_violation';
  end if;
  return local_time at time zone zone;
end;
$$;

revoke all on function public.birth_instant(integer, timestamp) from public, anon;
grant execute on function public.birth_instant(integer, timestamp) to authenticated;

create or replace function public.profiles_check_birth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  zone text;
  computed timestamptz;
begin
  select time_zone into zone
    from public.city_zones where id = new.birth_city_id;
  if zone is null then
    raise exception 'unknown birth city' using errcode = 'check_violation';
  end if;
  -- The calendar date and the wall clock are two columns describing one
  -- moment. Nothing tied them together, so a client could present an age
  -- of 36 with a twelve-year-old's chart — and the 18+ gate reads the
  -- date while the chart reads the clock.
  if new.birth_local::date <> new.birth_date then
    raise exception 'birth_date and birth_local disagree'
      using errcode = 'check_violation';
  end if;
  computed := new.birth_local at time zone zone;
  -- Either the instant renders back to the submitted wall clock — which
  -- takes both readings of a repeated hour — or it is what the server
  -- computes from that wall clock. A minute of slack absorbs historical
  -- offsets that carry seconds, which the client rounds away; a stale
  -- zone database is out by half an hour at least, usually a whole one.
  if (new.birth_utc at time zone zone) = new.birth_local
     or abs(extract(epoch from (new.birth_utc - computed))) <= 60 then
    return new;
  end if;
  raise exception 'birth_utc does not match the birth city and local time'
    using errcode = 'check_violation';
end;
$$;

-- ------------------------------------------------------------- consent
/**
 * Accepting a notice moves forward only. The timestamp was already the
 * server's; without this the version beside it could be set to a text
 * that was never shown, which is the same claim by another route.
 */
create or replace function public.profiles_set_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.consent_version < old.consent_version then
    raise exception 'consent version cannot go backwards'
      using errcode = 'check_violation';
  end if;
  new.consent_at = clock_timestamp();
  return new;
end;
$$;

-- The app ships a version constant and the server's date is UTC, so a
-- notice dated today is in the future for a few hours in Türkiye. A day
-- of slack costs nothing and turns a dead onboarding into a non-event.
alter table public.profiles
  drop constraint profiles_consent_version_not_future;

alter table public.profiles
  add constraint profiles_consent_version_not_future
    check (consent_version <= current_date + 1);

-- `updated_at` is written by its own trigger; column UPDATE is only
-- checked for columns the statement names, so granting it does nothing.
revoke update (updated_at) on public.profiles from authenticated;

-- ---------------------------------------------------------- privileges
-- `city_zones` kept Supabase's default grants: RLS governs reads and
-- writes, not TRUNCATE, and `anon` held it. Every other table in this
-- schema revokes them explicitly; this one was missed.
revoke all on public.city_zones from anon, authenticated;

-- A security-definer function with EXECUTE still on PUBLIC is half of an
-- escalation pair. The safety migration does this for its helpers; these
-- two were added later and were not.
revoke all on function private.blocks_snapshot_name() from public, anon;
revoke all on function private.photos_folder_limit() from public, anon;
revoke all on function private.prune_deleted_photo() from public, anon;
revoke all on function private.photos_no_rename() from public, anon;
