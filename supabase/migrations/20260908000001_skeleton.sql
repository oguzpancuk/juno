-- S4 walking skeleton: profiles, likes, matches, discover view, RLS.
-- Every table has RLS on. Other people's profiles are readable only
-- through the `discover` view, which runs as its owner and exposes public
-- columns plus a rounded distance — never location or birth data.

create extension if not exists postgis with schema extensions;

create type public.gender as enum ('woman', 'man', 'unspecified');
create type public.interest as enum ('women', 'men', 'everyone');
create type public.like_kind as enum ('like', 'pass');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 40),
  -- Age gate (Apple: 18+). Also enforced in the app before sign-up.
  birth_date date not null
    check (birth_date <= current_date - interval '18 years'),
  -- Wall-clock birth time as entered, kept for server-side re-validation.
  birth_local timestamp without time zone not null,
  birth_city_id integer not null check (birth_city_id > 0),
  birth_utc timestamptz not null,
  -- Public chart: planets + houses from @stardate/astro, WITHOUT the
  -- engine input (no utc, no coordinates). Shown to matches and in discover.
  chart jsonb not null,
  big_three jsonb not null,
  gender public.gender not null,
  interested_in public.interest not null,
  location extensions.geography (point, 4326) not null,
  radius_km integer not null default 50 check (radius_km between 5 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_location_idx on public.profiles using gist (location);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: insert own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: account deletion is an Edge Function (v1).

-- ------------------------------------------------------------------- likes
create table public.likes (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  kind public.like_kind not null,
  -- Conversation starter computed by the liking client from both charts
  -- (deterministic, so both sides produce the same text). Null for a pass.
  starter text check (starter is null or char_length(starter) <= 400),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id),
  check ((kind = 'like') or (starter is null))
);

create index likes_to_id_idx on public.likes (to_id) where kind = 'like';

alter table public.likes enable row level security;

create policy "likes: read own"
  on public.likes for select
  to authenticated
  using (from_id = (select auth.uid()));

create policy "likes: insert own"
  on public.likes for insert
  to authenticated
  with check (from_id = (select auth.uid()));

-- ----------------------------------------------------------------- matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.profiles (id) on delete cascade,
  b uuid not null references public.profiles (id) on delete cascade,
  starter text not null default '',
  created_at timestamptz not null default now(),
  unique (a, b),
  check (a < b)
);

create index matches_b_idx on public.matches (b);

alter table public.matches enable row level security;

create policy "matches: read own"
  on public.matches for select
  to authenticated
  using ((select auth.uid()) in (a, b));

-- No insert/update/delete policies: only the trigger below writes matches.

-- Mutual like → one match row (a < b). Runs as owner so it can write the
-- matches table that users cannot.
create or replace function public.create_match_on_mutual_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reciprocal public.likes%rowtype;
begin
  if new.kind <> 'like' then
    return new;
  end if;
  select * into reciprocal
    from public.likes
   where from_id = new.to_id and to_id = new.from_id and kind = 'like';
  if not found then
    return new;
  end if;
  insert into public.matches (a, b, starter)
  values (
    least(new.from_id, new.to_id),
    greatest(new.from_id, new.to_id),
    coalesce(new.starter, reciprocal.starter, '')
  )
  on conflict (a, b) do nothing;
  return new;
end;
$$;

create trigger likes_create_match
  after insert on public.likes
  for each row execute function public.create_match_on_mutual_like();

alter publication supabase_realtime add table public.matches;

-- ---------------------------------------------------------------- discover
-- Candidates for the calling user: inside their radius, mutual gender
-- preference, not themselves, not already liked or passed. Owner-executed
-- (security_invoker = false), so profile RLS does not apply inside; the
-- column list is the privacy boundary.
create view public.discover
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
  );

revoke all on public.discover from anon;
revoke all on public.profiles from anon;
revoke all on public.likes from anon;
revoke all on public.matches from anon;
grant select on public.discover to authenticated;
