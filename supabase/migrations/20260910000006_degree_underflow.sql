-- `as_degree` guarded one end of the range and not the other.
--
-- `numeric -> double precision` raises for values too small as well as
-- too large: `1e-400` goes through `strtod`, which sets ERANGE, and the
-- insert came back as `22003` with the constraint's internals in the
-- message rather than a plain refusal. The client reads the same value as
-- `0` and accepts it, so a crafted chart got neither an accept nor a
-- clean refusal.
--
-- The small-magnitude branch keeps the sign. Collapsing everything tiny
-- to zero would be a divergence in the dangerous direction: `-1e-321` is
-- a negative denormal in JavaScript and fails `>= 0` there, so it has to
-- fail here too.

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
    -- Too small to be a double: JavaScript reads these as zero, keeping
    -- the sign, and so does this.
    when abs((value #>> '{}')::numeric) < 1e-300
    then case when (value #>> '{}')::numeric < 0 then -1 else 0 end
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
