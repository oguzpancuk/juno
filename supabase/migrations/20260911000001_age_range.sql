-- Age range: who a person wants to be shown, alongside radius and gender.
--
-- Both sides are honoured, like the gender preference already is — you see
-- nobody outside your range, and nobody sees you outside theirs. A filter
-- that only ran one way would put people in front of others who had asked
-- not to see them.
--
-- The bounds are a preference, not a fact about the profile, so they are
-- mutable; birth_date is not, and remains the only source of an age.

alter table public.profiles
  add column age_min int not null default 18,
  add column age_max int not null default 99;

alter table public.profiles
  add constraint profiles_age_range_valid
    check (age_min >= 18 and age_max <= 120 and age_min <= age_max);

-- ---------------------------------------------------------------- discover
-- Unchanged except for the two age conditions.
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
  p.photos
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
  -- Mine, then theirs: both ranges have to hold.
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

-- ------------------------------------------------------------------ grant
-- `update` on profiles is granted column by column, so a new preference is
-- invisible to its owner until it is named here. Without this the app's
-- write succeeds and changes nothing, which is worse than an error.
grant update (age_min, age_max) on public.profiles to authenticated;

-- ------------------------------------------------------------- discovery
-- Two more preferences the discovery screen offers. Neither can be applied
-- server-side: the compatibility band is derived from a score the device
-- computes from two charts, and the element comes from the same chart. So
-- they are stored here to survive a restart and applied by the client,
-- which already has both charts in hand.
--
-- `min_band` is one of the four band keys; the engine owns that list, so
-- the constraint names them rather than referencing a type the database
-- has no business knowing about.
alter table public.profiles
  add column min_band text not null default 'quiet'
    check (min_band in ('quiet', 'even', 'strong', 'rare')),
  -- null means every element; an empty array would mean nobody, which is
  -- never what a person intends.
  add column sun_elements text[] null
    check (
      sun_elements is null
      or (
        cardinality(sun_elements) > 0
        and sun_elements <@ array['fire', 'earth', 'air', 'water']
      )
    );

grant update (min_band, sun_elements) on public.profiles to authenticated;
