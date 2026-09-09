-- v1 safety controls: block and report. Account deletion is the
-- `delete-account` Edge Function; the cascades below are what makes it a
-- one-line delete.
--
-- A block is one-directional as a row and two-directional in effect: the
-- blocked person must not learn they were blocked, so they cannot read the
-- row, but every surface (discover, matches, messages) is closed on both
-- sides.

create type public.report_reason as enum (
  'spam',
  'harassment',
  'nudity',
  'fake_profile',
  'underage',
  'other'
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- The reverse lookup is the hot one: every surface asks "did anyone block
-- me?" as well as "did I block them?".
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Only the blocker sees the row. There is no policy for the blocked side:
-- "you have been blocked" is not a fact the app hands out.
create policy "blocks: read own"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "blocks: insert own"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocks: delete own"
  on public.blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

-- Both ids go null rather than cascading, so the queue keeps what was
-- reported and when after an account goes. A row whose subject and
-- reporter are both gone names nobody; while one side is still there its
-- uuid remains, which is what makes the row useful to moderation and
-- useless for recognising a repeat offender who re-registers. Tying reports to a person across
-- accounts would need an identifier that outlives the account, which
-- KVKK makes a decision of its own.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_id uuid references public.profiles (id) on delete set null,
  reason public.report_reason not null,
  -- Optional free text from the reporter; never shown to anyone else.
  note text check (note is null or char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  -- Both ids can end up null once both accounts are gone; the constraint
  -- only has to stop a self-report while they are still there.
  check (
    reporter_id is null
    or reported_id is null
    or reporter_id <> reported_id
  )
);

create index reports_reported_idx on public.reports (reported_id);
-- One report per pair and reason: a second tap on the same reason is the
-- same complaint, but reporting the same person for something new is a
-- new record, or the app would swallow an escalation.
create unique index reports_pair_reason_idx
  on public.reports (reporter_id, reported_id, reason)
  where reporter_id is not null and reported_id is not null;

-- The columns are nullable only so the FK can null them when an account
-- goes; an INSERT still has to name both sides, or one caller could write
-- unbounded target-less rows into the moderation queue.
create or replace function public.reports_name_both_sides()
returns trigger
language plpgsql
as $$
begin
  if new.reporter_id is null or new.reported_id is null then
    raise exception 'a report names both sides' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger reports_name_both_sides
  before insert on public.reports
  for each row execute function public.reports_name_both_sides();

-- Once either side is gone the row must name nobody: the note is free
-- text a reporter wrote about a person, so it goes with the identities.
create or replace function public.reports_scrub_orphan()
returns trigger
language plpgsql
as $$
begin
  if new.reporter_id is null or new.reported_id is null then
    new.note = null;
  end if;
  return new;
end;
$$;

create trigger reports_scrub_orphan
  before update on public.reports
  for each row execute function public.reports_scrub_orphan();

alter table public.reports enable row level security;

-- No select policy on the table: the reporter reads their own history
-- through `my_reports`, which masks a subject who has blocked them. A
-- readable `reported_id` was the same oracle as the like row — present
-- after a block, null after a deletion.

create policy "reports: insert own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

-- No update or delete: a report is a record, not a draft. Moderation reads
-- it with the service role.
--
-- Residual, deliberate: filing a second report tells a prober the same
-- thing the like insert does, since a blocked subject still accepts the
-- row while a deleted one fails the foreign key. Error codes remain a
-- write-side oracle; only the read surfaces are closed.

-- Policy helpers live outside the API-exposed schemas. In `public` they
-- are also RPC endpoints, and `rpc/is_blocked` would answer the one
-- question a block must never answer: "did that person block me?".
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

/**
 * True when either side of the pair has blocked the other. Security
 * definer because the blocked side cannot read `blocks` and still has to
 * be shut out.
 */
create or replace function private.is_blocked(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
     where (b.blocker_id = (select auth.uid()) and b.blocked_id = other)
        or (b.blocked_id = (select auth.uid()) and b.blocker_id = other)
  );
$$;

revoke all on function private.is_blocked(uuid) from public, anon;
grant execute on function private.is_blocked(uuid) to authenticated;

/**
 * Membership in a match that is still open: both `is_match_member` and
 * "neither side has blocked the other". Replaces `is_match_member` in the
 * message policies, so a block closes the thread for both people at once.
 */
create or replace function private.match_open(match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
     where m.id = match
       and (select auth.uid()) in (m.a, m.b)
       and not exists (
         select 1 from public.blocks b
          where (b.blocker_id = m.a and b.blocked_id = m.b)
             or (b.blocker_id = m.b and b.blocked_id = m.a)
       )
  );
$$;

revoke all on function private.match_open(uuid) from public, anon;
grant execute on function private.match_open(uuid) to authenticated;

drop policy "messages: read own matches" on public.messages;
drop policy "messages: insert own" on public.messages;
drop policy "messages: recipient marks read" on public.messages;

create policy "messages: read own open matches"
  on public.messages for select
  to authenticated
  using (private.match_open(match_id));

create policy "messages: insert own"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.match_open(match_id)
  );

create policy "messages: recipient marks read"
  on public.messages for update
  to authenticated
  using (
    private.match_open(match_id)
    and sender_id <> (select auth.uid())
  )
  with check (
    private.match_open(match_id)
    and sender_id <> (select auth.uid())
  );

drop function public.is_match_member(uuid);

-- The match row itself was the second oracle: `match_profiles` hid the
-- pair but `matches` still listed it, and "row present, profile missing"
-- has exactly one cause. A deleted account takes its matches with it, so
-- both cases now look the same from the outside.
drop policy "matches: read own" on public.matches;

create policy "matches: read own open"
  on public.matches for select
  to authenticated
  using (
    (select auth.uid()) in (a, b)
    and not private.is_blocked(case when a = (select auth.uid()) then b else a end)
  );

-- `likes` was the third oracle: the blocked person still read their own
-- like row for the blocker, while a deleted account took its like rows
-- with it. Hiding the row closes the reading surface; a prober who
-- compares error codes on a write can still tell a block (42501) from a
-- deletion (23503), and closing that would need a tombstone model. Not
-- worth it for v1, but do not claim the two are indistinguishable.
drop policy "likes: read own" on public.likes;
drop policy "likes: insert own" on public.likes;

create policy "likes: read own open"
  on public.likes for select
  to authenticated
  using (
    from_id = (select auth.uid())
    and not private.is_blocked(to_id)
  );

create policy "likes: insert own open"
  on public.likes for insert
  to authenticated
  with check (
    from_id = (select auth.uid())
    and not private.is_blocked(to_id)
  );

-- ------------------------------------------------------------- my_reports
-- The reporter's own history, read-only. The subject's id and note are
-- masked when that person has blocked them, so the row reads the same as
-- one whose subject deleted their account.
create view public.my_reports
with (security_invoker = false)
as
select
  r.id,
  case
    when r.reported_id is null then null
    when private.is_blocked(r.reported_id) then null
    else r.reported_id
  end as reported_id,
  r.reason,
  -- The note goes with the id. A deleted subject's note is already null
  -- (the scrub trigger); masking a blocked subject's note keeps the two
  -- rows identical, or "id null but note present" would name the block.
  case
    when r.reported_id is not null and private.is_blocked(r.reported_id)
      then null
    else r.note
  end as note,
  r.created_at
from public.reports r
where r.reporter_id = (select auth.uid());

-- A single-table view is auto-updatable and runs as its owner, so the
-- default grants would let a reporter delete their own moderation record
-- over REST. Read-only, explicitly.
revoke all on public.my_reports from anon, authenticated;
grant select on public.my_reports to authenticated;

-- ---------------------------------------------------------------- discover
-- Same as before plus two exclusions: anyone in a block with me, either
-- direction, and anyone I have reported.
create or replace view public.discover
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  extract(year from age(current_date, p.birth_date))::int as age,
  p.gender,
  p.big_three,
  p.chart,
  round(extensions.st_distance(p.location, me.location) / 1000)::int
    as distance_km
from public.profiles p
join public.profiles me on me.id = (select auth.uid())
where p.id <> me.id
  and extensions.st_dwithin(p.location, me.location, me.radius_km * 1000)
  and (
    me.interested_in = 'everyone'
    or (me.interested_in = 'women' and p.gender = 'woman')
    or (me.interested_in = 'men' and p.gender = 'man')
  )
  and (
    p.interested_in = 'everyone'
    or (p.interested_in = 'women' and me.gender = 'woman')
    or (p.interested_in = 'men' and me.gender = 'man')
  )
  and not exists (
    select 1 from public.likes l
     where l.from_id = me.id and l.to_id = p.id
  )
  and not private.is_blocked(p.id)
  and not exists (
    select 1 from public.reports r
     where r.reporter_id = me.id and r.reported_id = p.id
  );

-- ---------------------------------------------------------- match_profiles
-- A block hides the match itself, so both people lose the thread and the
-- conversation-list row at the same moment.
create or replace view public.match_profiles
with (security_invoker = false)
as
select
  m.id as match_id,
  m.starter_key,
  m.created_at as matched_at,
  p.id,
  p.display_name,
  extract(year from age(current_date, p.birth_date))::int as age,
  p.gender,
  p.big_three,
  p.chart,
  last.body as last_body,
  last.created_at as last_at,
  last.sender_id as last_sender_id,
  coalesce(unread.n, 0)::int as unread_count
from public.matches m
join public.profiles p
  on p.id = case when m.a = (select auth.uid()) then m.b else m.a end
left join lateral (
  select msg.body, msg.created_at, msg.sender_id
    from public.messages msg
   where msg.match_id = m.id
   order by msg.created_at desc, msg.id desc
   limit 1
) last on true
left join lateral (
  select count(*) as n
    from public.messages msg
   where msg.match_id = m.id
     and msg.sender_id <> (select auth.uid())
     and msg.read_at is null
) unread on true
where (select auth.uid()) in (m.a, m.b)
  and not private.is_blocked(p.id);

-- Realtime DELETE events are not RLS-filtered: every subscriber sees the
-- primary key of every deleted row in the published tables, which both
-- leaks other people's match ids and tells a blocked person that a
-- disappearance was a deletion rather than a block. Nothing in the app
-- subscribes to deletes, so the publication stops emitting them.
alter publication supabase_realtime set (publish = 'insert, update');

revoke all on public.blocks from anon;
revoke all on public.reports from anon;
revoke truncate, references, trigger on public.blocks from anon, authenticated;
revoke truncate, references, trigger on public.reports from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant insert on public.reports to authenticated;
revoke select on public.reports from authenticated;
