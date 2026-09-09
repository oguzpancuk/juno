-- Two holes a review found in the previous migration.
--
-- 1. The folder cap was skipped for any folder with no profile row, and
--    the profile row was also what serialised concurrent uploads. Nothing
--    requires a profile before uploading, so an account that signs up and
--    never finishes onboarding had no limit at all — exactly the account
--    most likely to be abusive, and the one whose folder then grows past
--    what the deletion function can empty. The lock is now an advisory
--    lock on the folder itself, which exists whether the profile does or
--    not, and only ever contends with uploads into the same folder.
-- 2. `storage.move` renames an object without firing a delete, so the old
--    path stayed in `profiles.photos` for ever. Since the existence check
--    only looks at paths being added, nothing repaired it either, and the
--    profile stayed in every nearby deck with a photo behind which there
--    was nothing. Nothing in the app renames a photo, so renaming is
--    refused outright.

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
  folder := (storage.foldername(new.name))[1];
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

/**
 * Renaming is not a thing the app does, and it is a way to strand a path:
 * a move fires no delete, so `profiles.photos` keeps the old name and the
 * profile stays in the deck with nothing behind its photo. Replacing an
 * object in place (an upsert, same name) stays allowed.
 */
create or replace function private.photos_no_rename()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.bucket_id = 'photos' and new.name is distinct from old.name then
    raise exception 'photos cannot be renamed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger photos_no_rename
  before update on storage.objects
  for each row execute function private.photos_no_rename();
