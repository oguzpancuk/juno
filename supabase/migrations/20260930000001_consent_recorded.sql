-- KVKK: a profile cannot exist without a consent record, and the rule
-- that says so is one named CHECK (ROADMAP, "KVKK consent + privacy
-- policy": a profile insert without `consent_at` is rejected by a CHECK
-- constraint).
--
-- Until now two different things stood in for that rule. `consent_version`
-- was NOT NULL with no default, so an insert that never carried it was
-- refused — by the NOT NULL, not by a check. And `consent_at` had a
-- default of now() and a trigger that stamped it on every insert, so it
-- could never be missing at all, including on a row that had consented to
-- nothing: the timestamp was there whether or not the version beside it
-- was.
--
-- Now the stamp follows the consent. The trigger writes `consent_at` only
-- when the row carries a version, the column has no default, and
-- `profiles_consent_recorded` refuses any row where either half is
-- missing. An insert without a version is therefore an insert without
-- `consent_at`, and it is this CHECK that refuses it; so is an update
-- that tries to take the version away.
--
-- Existing rows: every one already has both halves (both columns were
-- NOT NULL), so the constraint validates as it is added and nobody's row
-- changes. What a member may write is unchanged: `consent_version`
-- through the column grant, never `consent_at`.
--
-- Down (one commit, no data touched, since the CHECK has kept both
-- halves present):
--   alter table public.profiles drop constraint profiles_consent_recorded;
--   alter table public.profiles alter column consent_version set not null,
--     alter column consent_at set not null,
--     alter column consent_at set default now();
--   and `profiles_set_consent` as 20260909000013_birth_instant.sql left it.

alter table public.profiles
  alter column consent_at drop default,
  alter column consent_at drop not null,
  alter column consent_version drop not null,
  add constraint profiles_consent_recorded
    check (consent_version is not null and consent_at is not null);

/**
 * Consent is stamped by the server, and only when there is consent to
 * stamp. Accepting moves forward only: a version naming a text that was
 * never shown is the same forged claim as a backdated timestamp.
 */
create or replace function public.profiles_set_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.consent_version < old.consent_version then
    raise exception 'consent version cannot go backwards'
      using errcode = 'check_violation';
  end if;
  new.consent_at = case
    when new.consent_version is null then null
    else clock_timestamp()
  end;
  return new;
end;
$$;
