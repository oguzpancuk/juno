-- One member could darken the app for everyone near them.
--
-- `'-infinity'::date` satisfies the 18+ check (it is certainly more than
-- eighteen years ago), satisfies the birth agreement rule (its wall clock
-- and its instant are both infinite and equal), and then breaks every
-- reader: `discover` and `match_profiles` compute
-- `extract(year from age(current_date, birth_date))::int`, and Postgres
-- answers `cannot convert infinity to integer`. The swipe deck and the
-- conversation list fail for every viewer whose radius covers that
-- profile, with nothing the app can do about it — only a delete in the
-- database clears it. Ten accounts in ten cities would be the whole
-- country.
--
-- Dates are bounded now, at both ends and on both columns. The lower
-- bound is a real one rather than merely finite: nobody using a dating
-- app was born before 1900, and a birth chart that far back is outside
-- what the ephemeris is checked against anyway.

alter table public.profiles
  add constraint profiles_birth_date_finite
    check (birth_date >= date '1900-01-01'),
  add constraint profiles_birth_local_finite
    check (
      birth_local >= timestamp '1900-01-01 00:00:00'
      and birth_local < timestamp '2100-01-01 00:00:00'
    ),
  add constraint profiles_birth_utc_finite
    check (
      birth_utc >= timestamptz '1900-01-01 00:00:00+00'
      and birth_utc < timestamptz '2100-01-01 00:00:00+00'
    );
