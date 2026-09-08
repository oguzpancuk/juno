-- v1 chat: messages inside a match, readable only by the two members.
-- The match is the authorisation unit: there is no message without one,
-- and membership is checked against `matches`, never against a client id.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  -- At least one non-whitespace character: btrim() alone would let a
  -- newline through, and "\n" is not a message.
  body text not null
    check (body ~ '[^[:space:]]' and char_length(body) <= 2000),
  -- Set by the recipient when the thread is opened; never by the sender.
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Thread reads are "newest first for one match"; unread counting is a
-- partial index so it stays cheap as a thread grows.
create index messages_match_created_idx
  on public.messages (match_id, created_at desc, id desc);
create index messages_unread_idx
  on public.messages (match_id, sender_id) where read_at is null;

-- Membership helper. Security definer so the policy does not depend on
-- the caller's view of `matches`, and stable so the planner calls it once
-- per row group rather than per row.
create or replace function public.is_match_member(match uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
     where m.id = match
       and (select auth.uid()) in (m.a, m.b)
  );
$$;

revoke all on function public.is_match_member(uuid) from public, anon;
grant execute on function public.is_match_member(uuid) to authenticated;

-- Only read_at may change after insert: an edited message would let one
-- side rewrite what the other already read.
create or replace function public.forbid_message_edit()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id
     or new.match_id is distinct from old.match_id
     or new.sender_id is distinct from old.sender_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'only read_at may change' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger messages_forbid_edit
  before update on public.messages
  for each row execute function public.forbid_message_edit();

alter table public.messages enable row level security;

create policy "messages: read own matches"
  on public.messages for select
  to authenticated
  using (public.is_match_member(match_id));

-- sender_id is pinned to the caller: a member cannot post as the other side.
create policy "messages: insert own"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_match_member(match_id)
  );

-- Read receipts: only the recipient marks a message read (the trigger
-- above limits the update to that one column).
create policy "messages: recipient marks read"
  on public.messages for update
  to authenticated
  using (
    public.is_match_member(match_id)
    and sender_id <> (select auth.uid())
  )
  with check (
    public.is_match_member(match_id)
    and sender_id <> (select auth.uid())
  );

-- No delete policy: a thread is the shared record of the match.

alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------- match_profiles
-- Extended with the conversation-list columns: last message and how many
-- of the counterpart's messages are still unread. Column list stays the
-- privacy boundary; the leading columns are unchanged.
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
where (select auth.uid()) in (m.a, m.b);

revoke all on public.messages from anon;
revoke all on public.match_profiles from anon;
revoke truncate, references, trigger on public.messages from anon, authenticated;
grant select on public.match_profiles to authenticated;
grant select, insert, update on public.messages to authenticated;
