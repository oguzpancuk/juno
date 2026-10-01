-- The success-signal views count members, not the launch demos.
--
-- `20260909000011_metrics` predates the demos (`20260917000001`), and
-- each demo is a full account: an `auth.users` row and a finished
-- profile. So every demo raised both sides of onboarding completion, and
-- since a like on a demo matches in the same round trip, the PRD's
-- "≥ 10 matches" would have been met by the first ten swipes on demos,
-- and a member's "Merhaba" to one counted as a match that carried a
-- message. None of that is a person meeting a person.
--
-- The demos stay visible, in their own columns, appended at the end so
-- `create or replace` keeps every existing column where it was: the
-- owner reading the dashboard should see that they were left out, and
-- how many.
--
-- Grants are unchanged — `create or replace` keeps a view's privileges —
-- and revoked again below anyway, so this file states its own boundary.

/** Onboarding completion, members only: accounts against finished profiles. */
create or replace view public.metrics_onboarding as
with people as (
  select
    u.id,
    p.id is not null as onboarded,
    coalesce(p.is_demo, false) as demo
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.deleted_at is null
)
select
  count(*) filter (where not demo) as accounts,
  count(*) filter (where not demo and onboarded) as profiles,
  case
    when count(*) filter (where not demo) = 0 then null
    else round(
      100.0 * count(*) filter (where not demo and onboarded)
        / count(*) filter (where not demo),
      1
    )
  end as completion_percent,
  count(*) filter (where demo) as demo_accounts
from people;

/**
 * Matches between two members, and how many of them ever carried a
 * message. A match with a demo is counted apart: it is the product's
 * welcome, not a signal.
 */
create or replace view public.metrics_matches as
with tagged as (
  select
    x.id,
    x.created_at,
    exists (
      select 1 from public.profiles p
       where p.id in (x.a, x.b) and p.is_demo
    ) as with_demo
  from public.matches x
)
select
  count(*) filter (where not with_demo) as matches,
  count(*) filter (
    where not with_demo
      and exists (select 1 from public.messages m where m.match_id = t.id)
  ) as matches_with_a_message,
  min(t.created_at) filter (where not with_demo) as first_match,
  max(t.created_at) filter (where not with_demo) as last_match,
  count(*) filter (where with_demo) as demo_matches
from tagged t;

/**
 * Conversations between two members where both sides said something, and
 * where both said it at least three times — the PRD's threshold for a
 * conversation that actually happened rather than one opening line. A
 * demo never writes back, so a thread with one would only ever add to
 * `silent` or to nothing; it is left out rather than counted as a
 * conversation that died.
 */
create or replace view public.metrics_conversations as
with per_match as (
  select
    m.id,
    count(*) filter (where msg.sender_id = m.a) as from_a,
    count(*) filter (where msg.sender_id = m.b) as from_b
  from public.matches m
  left join public.messages msg on msg.match_id = m.id
  where not exists (
    select 1 from public.profiles p
     where p.id in (m.a, m.b) and p.is_demo
  )
  group by m.id
)
select
  count(*) filter (where from_a > 0 and from_b > 0) as two_sided,
  count(*) filter (where from_a >= 3 and from_b >= 3) as two_sided_three_each,
  count(*) filter (where from_a + from_b = 0) as silent
from per_match;

revoke all on
  public.metrics_onboarding,
  public.metrics_matches,
  public.metrics_conversations
from anon, authenticated;
