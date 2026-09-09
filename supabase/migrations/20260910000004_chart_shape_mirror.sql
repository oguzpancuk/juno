-- The shape check was looser than the schema it claimed to mirror.
--
-- It required a longitude and a sign, and nothing else: a chart with no
-- `degree`, no `house`, no `retrograde`, or with `house = 77` and
-- `ascendant = -999`, was stored and then failed to parse in the app. The
-- member's own chart screen showed an error for ever — `chart` is
-- immutable after insert, so the only way out was deleting the account —
-- and every deck quietly dropped their card. Now it is the same rule as
-- `PublicPlacementSchema` and `PublicChartSchema` in packages/astro,
-- field for field.
--
-- The numeric comparisons are also guarded by CASE rather than by an
-- earlier OR arm: Postgres does not promise the evaluation order of OR,
-- so `longitude: "abc"` could have raised a cast error instead of failing
-- the check.

create or replace function private.is_sign(name text)
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

create or replace function private.is_placement(body jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(body) = 'object'
    and private.is_sign(body ->> 'sign')
    and case
      when jsonb_typeof(body -> 'longitude') = 'number'
      then (body ->> 'longitude')::numeric >= 0
        and (body ->> 'longitude')::numeric < 360
      else false
    end
    and case
      when jsonb_typeof(body -> 'degree') = 'number'
      then (body ->> 'degree')::numeric >= 0
        and (body ->> 'degree')::numeric < 30
      else false
    end
    and case
      when jsonb_typeof(body -> 'house') = 'number'
      then (body ->> 'house')::numeric in
        (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
      else false
    end
    and jsonb_typeof(body -> 'retrograde') = 'boolean',
    false
  );
$$;

/** A house cusp or angle: a number on the circle. */
create or replace function private.is_degree(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    case
      when jsonb_typeof(value) = 'number'
      then (value #>> '{}')::numeric >= 0 and (value #>> '{}')::numeric < 360
      else false
    end,
    false
  );
$$;

create or replace function private.is_public_chart(chart jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    -- Not a cast: `(chart -> 'version')::text` is the jsonb rendering, so
    -- a string "1" and the number 1 are told apart.
    (chart -> 'version')::text = '1'
    and jsonb_typeof(chart -> 'planets') = 'object'
    and jsonb_typeof(chart -> 'houses') = 'object'
    and (chart -> 'planets') ?& array[
      'sun', 'moon', 'mercury', 'venus', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ]
    and not exists (
      select 1
        from jsonb_each(chart -> 'planets') as planet(name, body)
       where not private.is_placement(body)
    )
    and private.is_degree(chart -> 'houses' -> 'ascendant')
    and private.is_degree(chart -> 'houses' -> 'mc')
    and jsonb_typeof(chart -> 'houses' -> 'cusps') = 'array'
    and jsonb_array_length(chart -> 'houses' -> 'cusps') = 12
    and not exists (
      select 1 from jsonb_array_elements(chart -> 'houses' -> 'cusps') as cusp
       where not private.is_degree(cusp)
    ),
    false
  );
$$;

-- The helpers live in `private`, which PostgREST does not expose, so they
-- are not RPC endpoints — the public pair were, and anon could call them
-- with a payload of any size. A CHECK is evaluated with the privileges of
-- whoever is inserting, so `authenticated` still needs EXECUTE; being in
-- `private` is what keeps them off the API.
-- Point the constraints at the private copies, then drop the public ones.
alter table public.profiles
  drop constraint profiles_chart_shape,
  drop constraint profiles_big_three_shape;

alter table public.profiles
  add constraint profiles_chart_shape check (private.is_public_chart(chart)),
  add constraint profiles_big_three_shape check (
    jsonb_typeof(big_three) = 'object'
    and private.is_sign(big_three ->> 'sun')
    and private.is_sign(big_three ->> 'moon')
    and private.is_sign(big_three ->> 'rising')
  );

drop function public.is_public_chart(jsonb);
drop function public.is_sign(text);

revoke all on function private.is_sign(text) from public, anon;
revoke all on function private.is_degree(jsonb) from public, anon;
revoke all on function private.is_placement(jsonb) from public, anon;
revoke all on function private.is_public_chart(jsonb) from public, anon;
grant execute on function private.is_sign(text) to authenticated;
grant execute on function private.is_degree(jsonb) to authenticated;
grant execute on function private.is_placement(jsonb) to authenticated;
grant execute on function private.is_public_chart(jsonb) to authenticated;
