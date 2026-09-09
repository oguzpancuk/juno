-- Two holes a review found in the previous migration pair.
--
-- 1. `my_blocks` joined `profiles` as its owner, so one insert into
--    `blocks` — which needs nothing but your own id as the blocker —
--    opened a live read on any profile id you had ever seen: their
--    current display name, every rename, and whether the account still
--    exists. The pair the rest of the schema seals shut was readable from
--    the side that had been blocked. The name is now snapshotted when the
--    block is written, and the view reads the snapshot: a record of what
--    you blocked, not a window on who they are now.
-- 2. `consent_at` was client-writable. The stamping trigger fires only on
--    an update that names `consent_version`, and `profiles: update own`
--    grants column-wide UPDATE, so one REST call could set the consent
--    timestamp to any value. That is the field the whole KVKK record
--    rests on, so the column is taken away from clients entirely.
-- 3. `consent_version` was a regex over text, which accepts 9999-99-99.
--    It is a date; the column says so now, and it cannot be in the future.

-- Defaulted, so a client never has to send it; the trigger below
-- overwrites whatever arrives with the name the server reads.
alter table public.blocks
  add column blocked_name text not null default '';

/**
 * Copy the blocked person's name onto the row. Owner rights: the blocker
 * cannot read that profile, which is the whole point — they get the name
 * as it was at the moment they blocked, and nothing after.
 */
create or replace function private.blocks_snapshot_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select display_name into new.blocked_name
    from public.profiles where id = new.blocked_id;
  return new;
end;
$$;

create trigger blocks_snapshot_name
  before insert on public.blocks
  for each row execute function private.blocks_snapshot_name();

-- Existing rows keep working: fill them once from the profile.
update public.blocks b
   set blocked_name = p.display_name
  from public.profiles p
 where p.id = b.blocked_id and b.blocked_name = '';

-- The name is written by the trigger, never by the client.
revoke update on public.blocks from authenticated;

create or replace view public.my_blocks
with (security_invoker = false)
as
select
  b.blocked_id,
  b.blocked_name as display_name,
  b.created_at
from public.blocks b
where b.blocker_id = (select auth.uid())
order by b.created_at desc, b.blocked_id;

revoke all on public.my_blocks from anon, authenticated;
grant select on public.my_blocks to authenticated;

-- ------------------------------------------------------------- consent
-- A date, so 9999-99-99 cannot be stored, and not in the future.
alter table public.profiles
  drop constraint if exists profiles_consent_version_check;

-- The stamping trigger names the column, and Postgres refuses to alter a
-- column a trigger depends on, so it is dropped and recreated around the
-- change.
drop trigger profiles_set_consent on public.profiles;

alter table public.profiles
  alter column consent_version type date using consent_version::date;

create trigger profiles_set_consent
  before insert or update of consent_version on public.profiles
  for each row execute function public.profiles_set_consent();

alter table public.profiles
  add constraint profiles_consent_version_not_future
    check (consent_version <= current_date);

-- The stamp is the server's. A client can accept a new version of the
-- notice; it cannot say when it did so.
--
-- Revoking one column is not enough while a table-wide UPDATE grant
-- stands — it covers every column on its own — so the grant is replaced
-- by the list of columns a member may actually change. Birth data is
-- absent because a trigger already freezes it; `consent_at`, `id` and
-- `created_at` because they are the server's.
revoke update on public.profiles from authenticated;

grant update (
  display_name,
  gender,
  interested_in,
  location,
  radius_km,
  bio,
  photos,
  consent_version,
  updated_at
) on public.profiles to authenticated;

-- --------------------------------------------------------------- photos
/**
 * A photos object with no folder skipped the cap entirely: `foldername`
 * answers `{}`, so the lock was a no-op and the count matched nothing.
 * No member can create one — the insert policy demands a folder named
 * after them — but a service-role write could, and it would then sit in
 * the bucket uncounted and unowned.
 */
create or replace function private.photos_folder_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  folder text;
begin
  if new.bucket_id <> 'photos' then
    return new;
  end if;
  -- An upsert replaces a row that is already counted. The BEFORE INSERT
  -- trigger runs before the conflict is resolved, so without this a full
  -- folder would refuse even a write that cannot grow it. The app does
  -- not upsert photos — it generates a fresh name each time — so this is
  -- for scripts and for anything that replaces an object in place.
  if exists (
    select 1 from storage.objects o
     where o.bucket_id = 'photos' and o.name = new.name
  ) then
    return new;
  end if;
  folder := (storage.foldername(new.name))[1];
  if folder is null then
    raise exception 'photos live in a folder' using errcode = 'check_violation';
  end if;
  -- Counting alone is not a limit: parallel inserts each read a snapshot
  -- from before the others committed and walk straight past it. The lock
  -- is keyed on the folder, so it serialises one member's own uploads and
  -- touches nobody else's.
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(folder, 0));
  if (
    select count(*) from storage.objects o
     where o.bucket_id = 'photos'
       and o.name like folder || '/%'
  ) >= 200 then
    raise exception 'too many photos in this folder'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
