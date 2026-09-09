-- The numbers the PRD calls success signals, as views.
--
-- They are for the owner reading the dashboard, not for the app: every
-- one of them is aggregate, and none is readable by a member. Grants are
-- the boundary here rather than RLS — a view has no policies of its own,
-- so `anon` and `authenticated` are revoked and only the service role,
-- which is what the dashboard uses, is left.
--
-- Aggregates only, deliberately: a per-person metrics table would be one
-- more place where who talked to whom is written down.

/** Onboarding completion: accounts created against profiles finished. */
create or replace view public.metrics_onboarding as
select
  (select count(*) from auth.users where deleted_at is null) as accounts,
  (select count(*) from public.profiles) as profiles,
  case
    when (select count(*) from auth.users where deleted_at is null) = 0
    then null
    else round(
      100.0 * (select count(*) from public.profiles)
        / (select count(*) from auth.users where deleted_at is null),
      1
    )
  end as completion_percent;

/** Matches, and how many of them ever carried a message. */
create or replace view public.metrics_matches as
select
  count(*) as matches,
  count(*) filter (
    where exists (select 1 from public.messages m where m.match_id = x.id)
  ) as matches_with_a_message,
  min(x.created_at) as first_match,
  max(x.created_at) as last_match
from public.matches x;

/**
 * Conversations where both sides said something, and where both said it
 * at least three times — the PRD's threshold for a conversation that
 * actually happened rather than one opening line.
 */
create or replace view public.metrics_conversations as
with per_match as (
  select
    m.id,
    count(*) filter (where msg.sender_id = m.a) as from_a,
    count(*) filter (where msg.sender_id = m.b) as from_b
  from public.matches m
  left join public.messages msg on msg.match_id = m.id
  group by m.id
)
select
  count(*) filter (where from_a > 0 and from_b > 0) as two_sided,
  count(*) filter (where from_a >= 3 and from_b >= 3) as two_sided_three_each,
  count(*) filter (where from_a + from_b = 0) as silent
from per_match;

/** Safety queue: what is waiting, and how long the oldest has waited. */
create or replace view public.metrics_reports as
select
  count(*) as reports,
  count(*) filter (where reported_id is not null) as about_a_live_account,
  min(created_at) as oldest,
  round(
    extract(epoch from (now() - min(created_at))) / 3600
  )::int as oldest_hours
from public.reports;

revoke all on
  public.metrics_onboarding,
  public.metrics_matches,
  public.metrics_conversations,
  public.metrics_reports
from anon, authenticated;
