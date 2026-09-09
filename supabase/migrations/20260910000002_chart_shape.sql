-- The second door into the same outage.
--
-- Bounding the birth dates closed one way for a single member to blank
-- the deck for everyone near them. This is the other: `chart` was only
-- checked for the presence of three top-level keys and `big_three` was
-- not checked at all, so a client could insert
-- `chart = {"version":1,"planets":{},"houses":[]}` with `big_three = {}`.
-- The row is then unreadable to the app — the schema the client parses
-- with requires ten planets, twelve cusps and three signs, and it parses
-- the deck as one array, so one bad row turns the whole deck into an
-- error state for every viewer in radius.
--
-- The shape is now the server's rule as well. It mirrors
-- `PublicChartSchema` and `BigThreeSchema` in packages/astro: if those
-- change, this changes with them.

/**
 * The twelve signs, spelled as `packages/astro` spells them. Never null:
 * a CHECK that evaluates to null passes, so a missing key would sail
 * through the constraints below.
 */
create or replace function public.is_sign(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    name in (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ),
    false
  );
$$;

/**
 * True when a public chart carries everything the app reads: the ten
 * bodies, each with a sign and a longitude in range, and a house layout
 * with twelve cusps.
 */
create or replace function public.is_public_chart(chart jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- coalesce for the same reason as `is_sign`: a missing key makes the
  -- comparisons null, and a null CHECK is a pass.
  select coalesce(
    chart ? 'version'
    and (chart -> 'version')::text = '1'
    and jsonb_typeof(chart -> 'planets') = 'object'
    and jsonb_typeof(chart -> 'houses') = 'object'
    and (chart -> 'planets') ?& array[
      'sun', 'moon', 'mercury', 'venus', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ]
    and not exists (
      select 1
        from jsonb_each(chart -> 'planets') as planet(name, body)
       where jsonb_typeof(body) <> 'object'
          or not (body ?& array['longitude', 'sign'])
          or jsonb_typeof(body -> 'longitude') <> 'number'
          or (body ->> 'longitude')::numeric < 0
          or (body ->> 'longitude')::numeric >= 360
          or not public.is_sign(body ->> 'sign')
    )
    and jsonb_typeof(chart -> 'houses' -> 'ascendant') = 'number'
    and jsonb_typeof(chart -> 'houses' -> 'mc') = 'number'
    and jsonb_typeof(chart -> 'houses' -> 'cusps') = 'array'
    and jsonb_array_length(chart -> 'houses' -> 'cusps') = 12
    and not exists (
      select 1 from jsonb_array_elements(chart -> 'houses' -> 'cusps') as cusp
       where jsonb_typeof(cusp) <> 'number'
    ),
    false
  );
$$;

alter table public.profiles
  add constraint profiles_chart_shape check (public.is_public_chart(chart)),
  add constraint profiles_big_three_shape check (
    jsonb_typeof(big_three) = 'object'
    and public.is_sign(big_three ->> 'sun')
    and public.is_sign(big_three ->> 'moon')
    and public.is_sign(big_three ->> 'rising')
  );
