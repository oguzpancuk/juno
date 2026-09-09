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

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  -- Optional free text from the reporter; never shown to anyone else.
  note text check (note is null or char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index reports_reported_idx on public.reports (reported_id);

alter table public.reports enable row level security;

create policy "reports: read own"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

create policy "reports: insert own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

-- No update or delete: a report is a record, not a draft. Moderation reads
-- it with the service role.

/**
 * True when either side of the pair has blocked the other. Security
 * definer because the blocked side cannot read `blocks` and still has to
 * be shut out.
 */
create or replace function public.is_blocked(other uuid)
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

revoke all on function public.is_blocked(uuid) from public, anon;
grant execute on function public.is_blocked(uuid) to authenticated;

/**
 * Membership in a match that is still open: both `is_match_member` and
 * "neither side has blocked the other". Replaces `is_match_member` in the
 * message policies, so a block closes the thread for both people at once.
 */
create or replace function public.match_open(match uuid)
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

revoke all on function public.match_open(uuid) from public, anon;
grant execute on function public.match_open(uuid) to authenticated;

drop policy "messages: read own matches" on public.messages;
drop policy "messages: insert own" on public.messages;
drop policy "messages: recipient marks read" on public.messages;

create policy "messages: read own open matches"
  on public.messages for select
  to authenticated
  using (public.match_open(match_id));

create policy "messages: insert own"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.match_open(match_id)
  );

create policy "messages: recipient marks read"
  on public.messages for update
  to authenticated
  using (
    public.match_open(match_id)
    and sender_id <> (select auth.uid())
  )
  with check (
    public.match_open(match_id)
    and sender_id <> (select auth.uid())
  );

drop function public.is_match_member(uuid);

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
  and not public.is_blocked(p.id)
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
  and not public.is_blocked(p.id);

revoke all on public.blocks from anon;
revoke all on public.reports from anon;
revoke truncate, references, trigger on public.blocks from anon, authenticated;
revoke truncate, references, trigger on public.reports from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;
