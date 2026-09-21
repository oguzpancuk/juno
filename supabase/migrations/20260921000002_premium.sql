-- Premium membership, without a payment step (owner, 2026-09-21: "simdilik
-- odeme kismina gerek yok... premium uyelik al dediginde direkt almis
-- olsin, odemeyi sonra ekleriz").
--
-- What a premium member gets: likes without a daily cap, five super likes
-- a week, the list of people who have liked them, and the choice to order
-- the deck by compatibility rather than by distance.
--
-- The flag is the member's own to set, because nothing is charged for it
-- yet. That is a product decision, not an oversight: there is no boundary
-- to defend until a receipt exists, and pretending otherwise would mean
-- an Edge Function that says yes to everyone. What IS defended here are
-- the quotas — a free member cannot spend a 21st like or a super like by
-- talking to PostgREST directly, and neither can a premium one spend a
-- sixth super like in a week. See ADR-0012.

-- ------------------------------------------------------------- the flag
alter table public.profiles
  add column is_premium boolean not null default false,
  -- Server-stamped (see below), so "since when" is never a client's word.
  add column premium_since timestamptz,
  -- How the deck is ordered on the device. Distance is what a free member
  -- gets; compatibility is the premium choice. It cannot be applied by
  -- `discover`: the score comes from two charts and @juno/astro, which is
  -- a TypeScript engine this database does not run — the same reason
  -- `min_band` and `sun_elements` are stored here and applied on the
  -- device. So this column is a preference the client honours, not a rule
  -- the server enforces; with a self-granted premium flag there is
  -- nothing it could usefully enforce anyway.
  add column sort_by text not null default 'distance'
    check (sort_by in ('distance', 'compatibility'));

comment on column public.profiles.is_premium is
  'Premium membership. Self-granted while there is no payment step '
  '(owner, 2026-09-21); the quotas in private.likes_enforce_quota are '
  'what it actually buys.';

/**
 * `premium_since` follows `is_premium` and nothing else: the moment the
 * flag went up, cleared when it comes down, and untouched while it stays
 * up. The column is outside the member's update grant, so this is the
 * only thing that writes it.
 */
create or replace function private.profiles_stamp_premium()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.is_premium then
    new.premium_since := null;
  elsif tg_op = 'INSERT' or not old.is_premium then
    new.premium_since := now();
  else
    new.premium_since := old.premium_since;
  end if;
  return new;
end;
$$;

create trigger profiles_stamp_premium
  before insert or update on public.profiles
  for each row execute function private.profiles_stamp_premium();

revoke all on function private.profiles_stamp_premium() from public, anon, authenticated;

-- `update` on profiles is granted column by column (see
-- 20260909000012_block_name_and_consent.sql): a column absent from the
-- list is invisible to its owner, and the app's write would succeed and
-- change nothing. `premium_since` is deliberately not here.
grant update (is_premium, sort_by) on public.profiles to authenticated;

-- ------------------------------------------------------------ super like
-- A kind of like, not a third verdict: the pair still matches the moment
-- it is answered, and the starter key is computed the same way. A column
-- rather than a new `like_kind` value, because every `kind = 'like'`
-- condition already written — the match trigger, the demo reciprocation,
-- the `discover` exclusion — keeps meaning what it says.
alter table public.likes
  add column is_super boolean not null default false;

alter table public.likes
  add constraint likes_super_is_a_like check (not is_super or kind = 'like');

-- The quota counts a member's own recent likes; the primary key starts
-- with from_id but cannot narrow by time.
create index likes_from_id_created_at_idx on public.likes (from_id, created_at);

-- ---------------------------------------------------------------- quotas
/**
 * What a free membership costs at the counter.
 *
 *   free    : FREE_DAILY_LIKES likes per rolling 24 hours, no super likes
 *   premium : likes without a cap, SUPER_LIKES_PER_WEEK super likes per
 *             rolling 7 days
 *
 * Rolling windows, not calendar ones: a calendar day needs a timezone to
 * mean anything, and this app's members are not all in one. "Your likes
 * come back one by one over the next day" is also the truer sentence.
 *
 * The numbers live here and in `apps/mobile/lib/premium-rules.ts`, which
 * shows what is left. `supabase/tests/premium.test.ts` drives these ones; the
 * app's own are checked against the same constants by
 * `apps/mobile/lib/premium.test.ts`. Change one and the other has to
 * agree.
 *
 * Definer, like `create_match_on_mutual_like`, and for the same kind of
 * reason: a counter that runs as the member counts what the member may
 * read, and `likes: read own open` (20260909000002_safety.sql) hides
 * every like sent to somebody who has since blocked the liker. As an
 * invoker function this counted 17 where 20 had been spent, so the cap
 * was 20 plus however many people had blocked you — the one thing the
 * header above says it is. EXECUTE stays revoked from everybody below;
 * nothing but the trigger calls it.
 */
create or replace function private.likes_enforce_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  liker public.profiles%rowtype;
  spent integer;
begin
  -- The server owns the clock. Without this a client picks its own
  -- `created_at`, dates its likes a week back, and every window below is
  -- empty whenever it wants one to be.
  new.created_at := now();
  -- A pass costs nothing, and the CHECK above has already refused a
  -- super pass.
  if new.kind <> 'like' then
    return new;
  end if;
  select * into liker from public.profiles p where p.id = new.from_id;
  -- No row: the foreign key refuses this insert a moment from now, and a
  -- quota message would be the wrong sentence for it. A demo profile's
  -- like is the product's own (private.likes_demo_reciprocate answers
  -- every like on a demo), so no quota applies to it — a popular demo
  -- would otherwise stop matching once twenty members had liked it.
  if not found or liker.is_demo then
    return new;
  end if;
  -- Counting alone is not a limit: parallel inserts each read a snapshot
  -- from before the others committed and walk straight past it — ten
  -- overlapping requests on a spent day stored ten more likes (review,
  -- round 2). The lock is keyed on the liker, so it serialises one
  -- member's own likes and touches nobody else's, the shape
  -- `private.photos_folder_limit` already uses for the photo cap. It is
  -- taken below the demo return on purpose: a demo's answering like is
  -- the product's own and counts against nothing, so a popular demo does
  -- not become the one row every liker queues behind.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.from_id::text, 0)
  );
  if new.is_super then
    if not liker.is_premium then
      -- The messages below are the app's discriminator: PostgREST gives
      -- every one of these the same 23514, and the message is what
      -- `quotaRefusal` in lib/premium-rules.ts reads. Pinned by the
      -- tests on both sides.
      raise exception 'super like needs premium'
        using errcode = 'check_violation';
    end if;
    select count(*) into spent
      from public.likes l
     where l.from_id = new.from_id
       and l.is_super
       and l.created_at > now() - interval '7 days';
    if spent >= 5 then
      raise exception 'super like quota spent'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if liker.is_premium then
    return new;
  end if;
  select count(*) into spent
    from public.likes l
   where l.from_id = new.from_id
     and l.kind = 'like'
     and l.created_at > now() - interval '24 hours';
  if spent >= 20 then
    raise exception 'daily like quota spent'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger likes_enforce_quota
  before insert on public.likes
  for each row execute function private.likes_enforce_quota();

revoke all on function private.likes_enforce_quota() from public, anon, authenticated;

-- -------------------------------------------------------------- liked_me
/**
 * The people who have liked you and are still waiting for an answer.
 *
 * Owner-executed like `discover` and `match_profiles`, with the same
 * column discipline: public columns only, never location or birth data.
 *
 * A free member gets the rows with everything that identifies a person
 * left null — the count, the star and the day are the upsell, and the
 * screen shows them as locked cards. That is the gate itself, not a blur
 * the client is trusted to draw: the names and the photographs are not in
 * the answer at all. (What it does not defend against is a member
 * granting themselves the flag, which costs a tap and is the point of
 * this release.)
 *
 * Who is left out: anyone this member has already swiped — a pass ends
 * it, and a like has already made the match — anyone blocked on either
 * side, and anyone without a photograph, exactly as `discover` has it.
 * A demo profile never appears: a demo likes a member only in answer to
 * that member's own like, which is a match in the same round trip.
 */
create view public.liked_me
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  extract(year from age(current_date, p.birth_date))::int as age,
  p.gender,
  p.big_three,
  p.chart,
  p.bio,
  p.photos,
  -- Free or premium, both of these are shown: "someone super liked you
  -- two days ago" is the whole argument for the membership.
  l.is_super,
  l.created_at as liked_at
from public.likes l
join public.profiles me on me.id = (select auth.uid())
-- The liker, for the conditions below: joined for everyone.
join public.profiles liker on liker.id = l.from_id
-- The same row again, for the columns — and only for a member who has
-- paid the tap. A free member's join finds nothing, so every column
-- above that comes from `p` is null in the answer. The masking is a join
-- rather than a CASE on each column so that `liked_me.id` stays a plain
-- reference to `profiles.id`, which is what keeps the generated types
-- (tests/database.types.ts) the shape `discover` and `match_profiles`
-- already have.
left join public.profiles p on p.id = liker.id and me.is_premium
where l.to_id = me.id
  and l.kind = 'like'
  and not exists (
    select 1 from public.likes mine
     where mine.from_id = me.id and mine.to_id = liker.id
  )
  and not private.is_blocked(liker.id)
  and cardinality(liker.photos) > 0;

revoke all on public.liked_me from anon;
grant select on public.liked_me to authenticated;
