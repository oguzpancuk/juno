-- Replies: a message may quote an earlier message of the same thread
-- (owner, 2026-09-11: "yanıtla özelliği olmalı"). The column is a plain
-- self-reference; what keeps it inside the thread is the trigger below,
-- because a foreign key alone would accept any message id in the table.

alter table public.messages
  add column reply_to uuid null
    references public.messages (id) on delete set null,
  -- A message cannot quote itself. There is no delete, so `on delete set
  -- null` above is for a future admin removal, not for a client.
  add constraint messages_reply_to_not_self
    check (reply_to is null or reply_to <> id);

-- "Who replied to this" is not a screen today, but a foreign key without
-- an index makes every (future) delete on messages scan the table.
create index messages_reply_to_idx
  on public.messages (reply_to)
  where reply_to is not null;

-- The quoted message must sit in the thread being written to. Security
-- definer, so the check sees the true row: under the sender's own RLS a
-- message of another match is invisible, and "invisible" and "does not
-- exist" would both come out as the same error. This way a reply across
-- threads is a check violation (23514) and a reply to a message that
-- does not exist falls through to the foreign key (23503) — the tests
-- can tell the two apart, and so can a log. Nothing is returned but the
-- verdict, so the definer context leaks no row.
create or replace function public.messages_reply_in_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quoted_match uuid;
begin
  if new.reply_to is null then
    return new;
  end if;
  select m.match_id into quoted_match
    from public.messages m
   where m.id = new.reply_to;
  if quoted_match is not null and quoted_match <> new.match_id then
    raise exception 'reply_to must name a message of the same match'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- No grant or revoke: a function returning `trigger` can only be fired by
-- its trigger, never called, so there is nothing to hand out.
create trigger messages_reply_in_match
  before insert on public.messages
  for each row execute function public.messages_reply_in_match();

-- Re-created from 20260909000001_chat.sql with `reply_to` in the frozen
-- list: a reply that could be re-pointed after the fact would let one side
-- change what the other already read it as answering. Only read_at moves.
create or replace function public.forbid_message_edit()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id
     or new.match_id is distinct from old.match_id
     or new.sender_id is distinct from old.sender_id
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
