-- Who a message is for, as a column (ADR-0010). The unread badge on the
-- Eşleşmeler tab follows every message sent to the signed-in person and
-- every read receipt they stamp. Subscribed with no filter, Realtime ran
-- one RLS check per subscriber per change on this table, so a message cost
-- as many checks as there were people online; a subscription's filter is
-- evaluated before its RLS check, and `recipient_id=eq.<me>` is the
-- cheapest filter measured (docs/NOTES.md, 2026-09-15). The column carries
-- nothing a member could not already work out — the other side of the
-- match — so it widens no one's view.

alter table public.messages
  add column recipient_id uuid null
    references public.profiles (id) on delete cascade;

-- Existing rows. The edit guard below refuses any update but read_at, and
-- would also refuse a row whose read_at is still null, so it is held off
-- for this one statement; nothing else writes here during a migration.
alter table public.messages disable trigger messages_forbid_edit;

-- The same rule as the trigger below: a row whose sender is not a member
-- of its match gets no recipient, so the check that follows refuses it and
-- the whole migration rolls back, rather than quietly addressing it to one
-- side (none exist; the check is what makes that a fact).
update public.messages msg
   set recipient_id = case
                        when m.a = msg.sender_id then m.b
                        when m.b = msg.sender_id then m.a
                      end
  from public.matches m
 where m.id = msg.match_id;

alter table public.messages enable trigger messages_forbid_edit;

-- Required, as a check rather than NOT NULL: the trigger below fills it,
-- so a client never supplies it, and a NOT NULL column with no default
-- would make every insert in the generated types name a recipient.
alter table public.messages
  add constraint messages_recipient_present
    check (recipient_id is not null);

-- Set by the server, from the match, on every insert: a client-supplied
-- value is overwritten, so a sender cannot address a message to anyone but
-- the other member. A sender who is not a member of the match gets no
-- recipient; for an authenticated caller the insert policy refuses the row
-- first, and for anyone bypassing RLS the check above does.
--
-- Security definer, like messages_reply_in_match, so the lookup sees the
-- match whatever the caller's own view of `matches` is; it returns nothing
-- but the new row, which the caller's policies still judge.
create or replace function public.messages_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select case
           when m.a = new.sender_id then m.b
           when m.b = new.sender_id then m.a
         end
    into new.recipient_id
    from public.matches m
   where m.id = new.match_id;
  if not found then
    new.recipient_id = null;
  end if;
  return new;
end;
$$;

-- A trigger fires whatever its function's EXECUTE grant says; the grant is
-- only checked when a trigger is created. Left on PUBLIC, any role able to
-- make a temporary table could attach this definer function to it and use
-- it to learn the other member of any match (checked on the local stack,
-- 2026-09-16), so it is revoked from every role the default privileges of
-- this schema grant, as 20260909000013_birth_instant.sql asks.
revoke all on function public.messages_recipient()
  from public, anon, authenticated, service_role;

create trigger messages_recipient
  before insert on public.messages
  for each row execute function public.messages_recipient();

-- Re-created from 20260911000002_reply_to.sql with `recipient_id` in the
-- frozen list: who a message was for is part of what was sent.
create or replace function public.forbid_message_edit()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id
     or new.match_id is distinct from old.match_id
     or new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.body is distinct from old.body
     or new.reply_to is distinct from old.reply_to
     or new.created_at is distinct from old.created_at then
    raise exception 'only read_at may change' using errcode = 'check_violation';
  end if;
  if new.read_at is null then
    raise exception 'read_at cannot be cleared' using errcode = 'check_violation';
  end if;
  new.read_at = coalesce(old.read_at, clock_timestamp());
  return new;
end;
$$;

-- A foreign key without an index makes every profile deletion scan this
-- table for the cascade. Not partial: the cascade's `recipient_id = $1`
-- does not imply `read_at is null`, so a partial index would not serve it.
create index messages_recipient_idx
  on public.messages (recipient_id);
