-- Three defects the previous migration introduced or left open.
--
-- 1. Deleting an account with more than one photo was impossible.
--    `storage.remove([a, b])` deletes both in one statement; AFTER-row
--    triggers run at the end of it, so the prune of `a` updated
--    `profiles.photos` when `b` was already gone, and the existence check
--    on the profile trigger then failed on `b`. The whole delete aborted,
--    for ever. The check now only looks at paths being *added*: an
--    existing path is the caller's own history, and the prune trigger is
--    what keeps it honest when the object goes away.
-- 2. The prune trigger cast a folder name to uuid without the guard its
--    sibling read policy has, so one object in a non-uuid folder — Studio
--    placeholders, any service-role write — could never be deleted again.
-- 3. Nothing bounded how many objects a member could put in their own
--    folder, so an account could be made too large for the deletion
--    function to finish: undeletable again, this time self-service.

create or replace function public.profiles_check_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  previous text[] := case when tg_op = 'UPDATE' then old.photos else '{}' end;
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
  -- Only what is new. Re-checking a path that was already in the list
  -- makes removing one photo fail whenever another was deleted in the
  -- same statement, which is exactly what account deletion does.
  if exists (
    select 1 from unnest(new.photos) as path
     where not (path = any (previous))
       and not exists (
         select 1 from storage.objects o
          where o.bucket_id = 'photos' and o.name = path
       )
  ) then
    raise exception 'photo does not exist' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function private.prune_deleted_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  folder text;
begin
  if old.bucket_id <> 'photos' then
    return old;
  end if;
  folder := (storage.foldername(old.name))[1];
  -- Guarded like the read policy: an object whose folder is not a uuid
  -- must still be deletable, or it can never be removed at all.
  if folder !~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    return old;
  end if;
  update public.profiles
     set photos = array_remove(photos, old.name)
   where id = folder::uuid
     and old.name = any (photos);
  return old;
end;
$$;

/**
 * A ceiling on objects per folder. The profile keeps at most six paths,
 * but nothing stopped a member from uploading tens of thousands of
 * objects into their own folder — and an account whose folder cannot be
 * emptied inside one function invocation cannot be deleted at all. Two
 * hundred is generous enough to replace six photos many times over, and
 * small enough that the deletion function always finishes.
 */
create or replace function private.photos_folder_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  folder text;
  owner uuid;
begin
  if new.bucket_id <> 'photos' then
    return new;
  end if;
  folder := (storage.foldername(new.name))[1];
  if folder !~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    return new;
  end if;
  -- Lock the owner's profile row first. Counting alone is not a limit:
  -- concurrent inserts each read a snapshot from before the others
  -- committed, so a burst walks straight past it. The profile row is the
  -- natural mutex — one per folder, and it always exists for a member.
  select id into owner from public.profiles where id = folder::uuid
    for update;
  if owner is null then
    return new;
  end if;
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

create trigger photos_folder_limit
  before insert on storage.objects
  for each row execute function private.photos_folder_limit();
