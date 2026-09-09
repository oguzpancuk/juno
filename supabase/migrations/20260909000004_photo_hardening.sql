-- Photo hardening, after a review found two ways the previous migration's
-- guarantees could be walked around.
--
-- 1. The one-segment rule was only on the insert policy. `storage.move`
--    goes through the UPDATE policy, so a caller could move their own
--    object into `<uid>/deep/hidden.png`. A nested object survives the
--    flat listing that account deletion walks, and worse, the folder
--    pseudo-row it produces cannot be removed — the delete loop never
--    saw the folder empty and burned the worker on every retry, so the
--    account became permanently undeletable.
-- 2. `profiles.photos` was checked against storage only when it was
--    written. Deleting the object afterwards left the path in the array,
--    so a profile with no reachable photo stayed in everyone's deck.

drop policy "photos: replace own" on storage.objects;

create policy "photos: replace own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    -- Same rule as the insert policy: exactly one folder level.
    and array_length(storage.foldername(name), 1) = 1
  );

-- The read policy's cast is only guarded if the regex is evaluated first,
-- and the planner does not promise that. CASE does.
drop policy "photos: read unless blocked" on storage.objects;

create policy "photos: read unless blocked"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos'
    and case
      when (storage.foldername(name))[1] ~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then not private.is_blocked(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

/**
 * Keep `profiles.photos` honest when an object goes away. Without this the
 * array is only checked on write: delete the object afterwards and the
 * profile keeps a path that resolves to nothing, which is enough to stay
 * in every nearby deck with a blank card.
 *
 * Owner rights: it writes a profile row the deleting user may not own —
 * the account-deletion path removes another user's objects. The profile
 * trigger is skipped by construction, since removing an element can only
 * shrink a list that already passed.
 */
create or replace function private.prune_deleted_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id <> 'photos' then
    return old;
  end if;
  update public.profiles
     set photos = array_remove(photos, old.name)
   where id = ((storage.foldername(old.name))[1])::uuid
     and old.name = any (photos);
  return old;
end;
$$;

create trigger prune_deleted_photo
  after delete on storage.objects
  for each row execute function private.prune_deleted_photo();

-- Consistency with every other function in these migrations: the search
-- path is fixed, not inherited from the caller.
create or replace function public.profiles_check_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if cardinality(new.photos) > 6 then
    raise exception 'at most six photos' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from unnest(new.photos) as path
     where path !~ ('^' || new.id::text || '/[^/]+$')
  ) then
    raise exception 'photos must live in the owner folder'
      using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from unnest(new.photos) as path
     where not exists (
       select 1 from storage.objects o
        where o.bucket_id = 'photos' and o.name = path
     )
  ) then
    raise exception 'photo does not exist' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
