-- The blocked list, so a block can be undone.
--
-- Blocking is reachable from a profile and from a chat, but until now
-- nothing showed what had been blocked and there was no way back. The
-- rows themselves are already readable by the blocker; what is missing is
-- the name, and `profiles` is not readable across accounts. So this view
-- runs as its owner and hands back only the two columns the screen needs,
-- for rows the caller blocked.
--
-- Nothing new leaks: a member can already read their own `blocks` rows,
-- and a row disappears when the other account is deleted either way.
-- The reverse direction stays invisible, as everywhere else — being
-- blocked is not a fact this app hands out.

create or replace view public.my_blocks
with (security_invoker = false)
as
select
  b.blocked_id,
  p.display_name,
  b.created_at
from public.blocks b
join public.profiles p on p.id = b.blocked_id
where b.blocker_id = (select auth.uid())
order by b.created_at desc, b.blocked_id;

revoke all on public.my_blocks from anon, authenticated;
grant select on public.my_blocks to authenticated;
