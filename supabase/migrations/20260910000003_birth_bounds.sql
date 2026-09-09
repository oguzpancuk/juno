-- Two corrections to the bounds added in 20260910000001.
--
-- 1. Its header says "bounded at both ends", but `birth_date` only got a
--    floor. `'infinity'::date` is refused today by the 18+ rule alone —
--    move that rule to an age range, or into a trigger, and the
--    deck-blanking bug is back with nothing to catch it. The invariant a
--    file claims should be the invariant it implements.
-- 2. The three floors disagreed by up to a day: `birth_local` is a wall
--    clock and `birth_utc` an instant, so a wall clock of 1900-01-01
--    00:00 anywhere east of UTC converts to 1899, and the row was refused
--    with a message the app renders as "invalid data" — a dead end with
--    no field to change. The instant's floor now sits a year earlier, so
--    the two agree for every zone.

alter table public.profiles
  drop constraint profiles_birth_date_finite,
  drop constraint profiles_birth_utc_finite;

alter table public.profiles
  add constraint profiles_birth_date_finite
    check (birth_date >= date '1900-01-01' and birth_date < date '2100-01-01'),
  add constraint profiles_birth_utc_finite
    check (
      birth_utc >= timestamptz '1899-01-01 00:00:00+00'
      and birth_utc < timestamptz '2100-01-01 00:00:00+00'
    );
