-- `as_degree` guarded one end of the range and not the other.
--
-- `numeric -> double precision` raises for values too small as well as
-- too large: `1e-400` goes through `strtod`, which sets ERANGE, and the
-- insert came back as `22003` with the constraint's internals in the
-- message rather than a plain refusal. The client reads the same value as
-- `0` and accepts it, so a crafted chart got neither an accept nor a
-- clean refusal.
--
-- The small-magnitude branch does not collapse everything to zero:
-- `-1e-321` is a real negative denormal and the client refuses it, so
-- accepting it here would be a divergence in the dangerous direction. It
-- answers null instead, the same answer this function already gives for
-- anything that is not a degree. That also refuses the narrower band the
-- client would accept as `-0`; strictly refusing more than the client is
-- the safe side of the line.

/** The double the client will see, or null when it is not one. */
create or replace function private.as_degree(value jsonb)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) <> 'number' then null
    -- Too large to be a double: not a degree, and the cast would raise.
    when abs((value #>> '{}')::numeric) > 1e307 then null
    -- Too small to be a double. A negative one is either a real negative
    -- denormal, which the client refuses, or `-0`, which the client
    -- accepts because `-0 >= 0` is true in JavaScript. Refusing both is
    -- the fail-closed direction and the only one worth having: nothing
    -- the engine emits is smaller than 1e-4, so the band is unreachable
    -- except by a crafted client. It answers "not a degree" rather than a
    -- magic negative, which a future signed field would read as a value.
    when abs((value #>> '{}')::numeric) < 1e-300
    then case when (value #>> '{}')::numeric < 0 then null else 0 end
    else (value #>> '{}')::numeric::double precision
  end;
$$;

/**
 * Same rule as before, with the last type-dependent call moved inside the
 * CASE that guards it: `jsonb_array_length` raises on a non-array, and an
 * earlier AND arm is not a promise about evaluation order — which is the
 * argument the rest of this file already makes.
 */
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
    and case
      when jsonb_typeof(chart -> 'houses' -> 'cusps') = 'array'
      then jsonb_array_length(chart -> 'houses' -> 'cusps') = 12
        and not exists (
          select 1
            from jsonb_array_elements(chart -> 'houses' -> 'cusps') as cusp
           where not private.is_degree(cusp)
        )
      else false
    end,
    false
  );
$$;
