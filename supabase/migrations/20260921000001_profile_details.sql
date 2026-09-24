-- Four optional facts on a profile: height, interest tags, university and
-- occupation (owner, 2026-09-21: "boy, ilgi alanları (çoktan seçmeli),
-- okuduğu üniversite, mesleği").
--
-- All four are nullable or empty by default, so every existing row stays
-- valid and the change is one commit to undo. None of them is a
-- preference: nothing filters on them, they are shown on the card and on
-- the profile page. The interest list is fixed in the app
-- (`apps/mobile/lib/profile-details.ts`) and checked here; free text
-- would be a second unmoderated field on a dating profile, and a tag
-- nobody else can pick matches nobody.
--
-- Every limit below has a twin in that module; change one and the other
-- has to agree.

/**
 * True when an array holds no value twice.
 *
 * A CHECK constraint may not contain a subquery, and `unnest` needs one,
 * so the set test lives in a function the constraint calls. Immutable and
 * invoker-rights: it reads nothing, it only looks at its argument.
 */
create or replace function private.is_set(items text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select pg_catalog.cardinality(items) = (
    select pg_catalog.count(distinct item) from pg_catalog.unnest(items) as item
  );
$$;

-- A CHECK runs with the privileges of whoever is writing, so both roles
-- that write a profile need EXECUTE; `private` is not on the API either
-- way (PostgREST exposes `public` and `graphql_public` only).
revoke all on function private.is_set(text[]) from public, anon;
grant execute on function private.is_set(text[]) to authenticated, service_role;

alter table public.profiles
  -- smallint: a height in centimetres, never a fraction. The ends are the
  -- picker's; outside them the number is a typo, not a height.
  add column height_cm smallint
    check (height_cm is null or height_cm between 120 and 230),
  -- Empty rather than null, like `photos`: "picked none" and "not
  -- answered" are the same thing here, and one of them is enough.
  add column interests text[] not null default '{}'
    check (
      cardinality(interests) <= 8
      -- No duplicates: the app writes a set, and a repeated tag would be
      -- drawn twice and count twice against the cap.
      and private.is_set(interests)
      and interests <@ array[
        'music', 'live_music', 'dancing', 'cinema', 'series', 'books',
        'poetry', 'art', 'photography', 'theatre', 'travel', 'camping',
        'hiking', 'sea', 'skiing', 'cycling', 'running', 'gym', 'yoga',
        'pilates', 'football', 'basketball', 'cooking', 'coffee', 'wine',
        'brunch', 'street_food', 'cats', 'dogs', 'plants', 'board_games',
        'video_games', 'technology', 'astrology', 'meditation',
        'volunteering'
      ]
    ),
  -- One short line each, and never an empty string: "" would be a second
  -- way to say "not answered" that every reader would have to know about.
  add column university text
    check (university is null or char_length(university) between 1 and 60),
  add column occupation text
    check (occupation is null or char_length(occupation) between 1 and 60);

comment on column public.profiles.interests is
  'Interest tag keys from apps/mobile/lib/profile-details.ts. The Turkish '
  'words are in the app; the database stores and checks the keys.';

-- `update` on profiles is granted column by column, so a new field is
-- invisible to its owner until it is named here. Without this the app's
-- write succeeds and changes nothing, which is worse than an error.
grant update (height_cm, interests, university, occupation)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------- discover
-- Unchanged except for the four columns at the end: `create or replace
-- view` can only add columns there. The column list is the privacy
-- boundary, and these four are exactly what the card and the profile
-- sheet draw.
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
    as distance_km,
  p.bio,
  p.photos,
  p.height_cm,
  p.interests,
  p.university,
  p.occupation
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
  and extract(year from age(current_date, p.birth_date))::int
      between me.age_min and me.age_max
  and extract(year from age(current_date, me.birth_date))::int
      between p.age_min and p.age_max
  and not exists (
    select 1 from public.likes l
     where l.from_id = me.id and l.to_id = p.id
  )
  and not private.is_blocked(p.id)
  and not exists (
    select 1 from public.reports r
     where r.reporter_id = me.id and r.reported_id = p.id
  )
  and cardinality(p.photos) > 0;

-- ---------------------------------------------------------- match_profiles
-- The same four columns, for the same reason: the chat header opens the
-- very same profile sheet the deck does.
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
  coalesce(unread.n, 0)::int as unread_count,
  p.bio,
  p.photos,
  p.height_cm,
  p.interests,
  p.university,
  p.occupation
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
