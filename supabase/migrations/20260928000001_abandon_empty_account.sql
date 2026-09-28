-- Onboarding's "Farklı bir hesapla gir" for an account Apple or Google
-- opened and nobody finished (ADR-0013): deletes the caller's auth user,
-- but only while the account is empty — no profile row and no photo in
-- its storage folder. Returns whether it deleted.
--
-- A function of its own, not a mode of the `delete-account` Edge
-- Function, so it fails closed: a server without this migration answers
-- "function not found" and deletes nothing, in whatever order the app,
-- the functions and the database are deployed or rolled back. A body
-- flag on `delete-account` did the opposite — an older function ignores
-- the body and deletes a full member (review of PR #13, round 3).
--
-- One transaction, so the check and the delete cannot be split by a
-- profile insert. The caller's `auth.users` row is locked first: a
-- concurrent `profiles` insert holds a key-share lock on it for its FK
-- check, so either the insert commits before the lock is granted and the
-- check below (a new statement, so a new snapshot) sees it, or the insert
-- waits behind this transaction and then fails its FK against a deleted
-- user. Nothing a member has is ever cascaded away by this function.
create or replace function public.abandon_empty_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return false;
  end if;
  perform 1 from auth.users where id = caller for update;
  if not found then
    return false;
  end if;
  if exists (select 1 from public.profiles where id = caller) then
    return false;
  end if;
  -- Storage objects are not rows the cascade reaches, and this function
  -- cannot remove them (Storage refuses direct deletes). An account with
  -- a photo is not empty: it stays, and settings' delete takes it.
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'photos'
      and (storage.foldername(name))[1] = caller::text
  ) then
    return false;
  end if;
  delete from auth.users where id = caller;
  return true;
end;
$$;

revoke all on function public.abandon_empty_account() from public, anon;
grant execute on function public.abandon_empty_account() to authenticated;
