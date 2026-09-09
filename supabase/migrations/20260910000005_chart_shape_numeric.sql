-- Two things the private-schema move got wrong.
--
-- 1. Moving the helpers into `private` took `profiles` away from the
--    service role: `private` is granted to `authenticated` only, and a
--    CHECK runs with the writer's privileges, so every service-role write
--    failed with "permission denied for function is_sign" — the seed
--    scripts, and any future backfill, moderation write or Edge Function.
--    The schema stays off the API either way: PostgREST exposes `public`
--    and `graphql_public`, and nothing else.
--
-- 2. The check compared in `numeric` and the app compares in IEEE-754.
--    `359.99999999999999999` is under 360 as a numeric and becomes
--    exactly 360 when `JSON.parse` reads it, so a crafted chart passed
--    the constraint and then failed to parse in the app for ever — the
--    member's own chart screen erroring on every launch, with `chart`
--    immutable and account deletion the only way out. The comparisons are
--    made in double precision now, which is the arithmetic the client
--    actually uses, with a magnitude guard so a number too large to be a
--    double is refused rather than raising.
--
-- The two `jsonb_each` walks are wrapped in CASE for the same reason the
-- casts were: they raise on the wrong jsonb type, and an earlier AND arm
-- is not a promise about evaluation order.

grant usage on schema private to service_role;

/** The double the client will see, or null if it is not a number. */
create or replace function private.as_degree(value jsonb)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) <> 'number' then null
    -- Outside the range of a double the cast would raise; such a value is
    -- not a degree anyway.
    when abs((value #>> '{}')::numeric) > 1e307 then null
    else (value #>> '{}')::numeric::double precision
  end;
$$;

create or replace function private.is_degree(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    private.as_degree(value) >= 0 and private.as_degree(value) < 360,
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
    and private.is_degree(body -> 'longitude')
    and private.as_degree(body -> 'degree') >= 0
    and private.as_degree(body -> 'degree') < 30
    and private.as_degree(body -> 'house') in
      (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
    and jsonb_typeof(body -> 'retrograde') = 'boolean',
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
    (chart -> 'version')::text = '1'
    and jsonb_typeof(chart -> 'planets') = 'object'
    and jsonb_typeof(chart -> 'houses') = 'object'
    and (chart -> 'planets') ?& array[
      'sun', 'moon', 'mercury', 'venus', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ]
    and case
      when jsonb_typeof(chart -> 'planets') = 'object'
      then not exists (
        select 1
          from jsonb_each(chart -> 'planets') as planet(name, body)
         where not private.is_placement(body)
      )
      else false
    end
    and private.is_degree(chart -> 'houses' -> 'ascendant')
    and private.is_degree(chart -> 'houses' -> 'mc')
    and jsonb_typeof(chart -> 'houses' -> 'cusps') = 'array'
    and jsonb_array_length(chart -> 'houses' -> 'cusps') = 12
    and case
      when jsonb_typeof(chart -> 'houses' -> 'cusps') = 'array'
      then not exists (
        select 1
          from jsonb_array_elements(chart -> 'houses' -> 'cusps') as cusp
         where not private.is_degree(cusp)
      )
      else false
    end,
    false
  );
$$;

revoke all on function private.as_degree(jsonb) from public, anon;
grant execute on function private.as_degree(jsonb)
  to authenticated, service_role;
grant execute on function private.is_sign(text) to service_role;
grant execute on function private.is_degree(jsonb) to service_role;
grant execute on function private.is_placement(jsonb) to service_role;
grant execute on function private.is_public_chart(jsonb) to service_role;
