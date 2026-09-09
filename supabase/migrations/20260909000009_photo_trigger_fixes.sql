-- Two holes in the triggers added one migration ago.
--
-- 1. The rename guard tested `new.bucket_id` only, so moving an object
--    *out* of the photos bucket sailed through: no delete fires, the
--    prune trigger never runs, and `profiles.photos` keeps a path with
--    nothing behind it — the profile then sits in every nearby deck with
--    a blank card. Today only the service role can do it, because the
--    single UPDATE policy on the bucket demands `bucket_id = 'photos'`;
--    but RLS policies OR together, so the first other bucket with an
--    "own folder" update policy would open this for everyone, and no
--    migration for that bucket would mention photos.
-- 2. The folder cap counted before Postgres resolved the conflict on an
--    upsert, so at exactly 200 objects replacing a photo in place was
--    refused too — and the sweep that could bring the folder back under
--    the cap runs after an upload, which is precisely what was refused.
--    A full folder could not be emptied through the app at all.

create or replace function private.photos_no_rename()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Either side: a photo may not become something else, and something
  -- else may not become a photo under a different name.
  if (old.bucket_id = 'photos' or new.bucket_id = 'photos')
     and (new.name is distinct from old.name
          or new.bucket_id is distinct from old.bucket_id)
  then
    raise exception 'photos cannot be renamed or moved'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

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
  -- folder refuses even the writes that would not grow it.
  if exists (
    select 1 from storage.objects o
     where o.bucket_id = 'photos' and o.name = new.name
  ) then
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
