-- Demo profiles: the twenty accounts the product launches with, and the
-- rule that turns a like on one of them into a match.
--
-- The owner asked for it this way (2026-09-17): "20 demo profili açıp
-- canlıya çıkar. gerçek biri kayıt olduğunda hepsi o kullanıcıyı
-- beğensin, kullanıcı beğenirse otomatik eşleşsin."
--
-- What is built here is the second half of that sentence, and it produces
-- the first half's effect exactly. The alternative — writing twenty likes
-- the moment a profile is created — cannot be done without computing
-- twenty starter keys on the server, and a starter key is the output of
-- `@juno/astro`, which is a TypeScript engine this database does not run.
-- Worse, `create_match_on_mutual_like` refuses a pair whose two keys
-- disagree, so a server-side key that drifted from the client's by one
-- aspect would not produce a quiet mismatch: it would make the member's
-- own swipe fail.
--
-- Reciprocating at the moment of the like sidesteps both. The key is the
-- one the member's own client just computed, so the two sides agree by
-- construction, and the visible result is the same — every demo has liked
-- you, and liking one back matches. Nothing in the product shows who has
-- liked you, so there is no screen on which the two designs differ.

-- ------------------------------------------------------------------- flag
alter table public.profiles
  add column is_demo boolean not null default false;

comment on column public.profiles.is_demo is
  'A launch demo account, not a member. Set only by the seeding script '
  '(scripts/seed-demo.ts) with the service role; see '
  'private.likes_demo_reciprocate.';

-- Not in `discover`, not in `match_profiles`: the owner asked for demos a
-- member cannot tell apart from anyone else, so the column stays on the
-- table and never reaches a client.

/**
 * `is_demo` is the server's, not a client's.
 *
 * UPDATE is already closed — members hold a column-by-column update grant
 * and this column is not in it — but INSERT is not, and onboarding is an
 * insert the member makes for themselves. Without this a member could
 * create their own profile with `is_demo: true` and collect a match from
 * everyone who liked them, having swiped on nobody.
 *
 * Invoker, deliberately: a definer function runs as its owner, and the
 * question this asks is who the caller is. The seeding script arrives as
 * `service_role`; `postgres` and the migration runner are members of it
 * by superuser, so they pass too.
 */
create or replace function private.profiles_guard_demo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_has_role(current_user, 'service_role', 'MEMBER') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_demo := false;
  elsif new.is_demo is distinct from old.is_demo then
    raise exception 'is_demo is not yours to set'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_demo
  before insert or update on public.profiles
  for each row execute function private.profiles_guard_demo();

-- ------------------------------------------------------------ reciprocate
/**
 * A like on a demo profile is answered by that demo, with the same
 * starter key, which the existing `likes_create_match` then turns into a
 * match.
 *
 * Definer: the row it writes belongs to the demo, and `likes` is
 * insert-own under RLS.
 *
 * Trigger order matters and is alphabetical among AFTER INSERT triggers
 * on this table: `likes_create_match` runs first and finds nothing
 * reciprocal, then this one writes the demo's like, and *that* insert
 * fires `likes_create_match` again — this time with both halves present.
 * Renaming either trigger past the other breaks the match, which is what
 * `supabase/tests/demo.test.ts` is watching.
 *
 * The recursion stops after one step: the row this writes has a member,
 * not a demo, as its `to_id`.
 */
create or replace function private.likes_demo_reciprocate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'like' then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p
     where p.id = new.to_id and p.is_demo
  ) then
    return new;
  end if;
  -- `do nothing` rather than an existence check: the primary key is the
  -- pair, and a demo that has somehow already answered this member must
  -- not turn their swipe into an error.
  insert into public.likes (from_id, to_id, kind, starter_key)
  values (new.to_id, new.from_id, 'like', new.starter_key)
  on conflict (from_id, to_id) do nothing;
  return new;
end;
$$;

create trigger likes_demo_reciprocate
  after insert on public.likes
  for each row execute function private.likes_demo_reciprocate();
