-- KVKK: the record that the notice was accepted.
--
-- The notice itself is shown at `/legal` and summarised on the sign-up
-- screen. What was missing is the proof: which version of the text the
-- person accepted, and when. Both live on the profile, because a profile
-- is exactly the point at which birth data and location start being
-- processed.
--
-- No default on `consent_version`: an insert that does not carry it is
-- refused, so a client cannot create a profile without having shown the
-- notice. `consent_at` is server-owned like every other timestamp here —
-- a client must not be able to claim consent at a time of its choosing.

alter table public.profiles
  add column consent_version text not null
    check (consent_version ~ '^\d{4}-\d{2}-\d{2}$'),
  add column consent_at timestamptz not null default now();

comment on column public.profiles.consent_version is
  'Version (date) of the privacy notice the member accepted.';

/**
 * Consent is stamped by the server. Re-accepting a newer version of the
 * notice moves the timestamp forward; withdrawing consent is deleting the
 * account, which is why there is no way to null this.
 */
create or replace function public.profiles_set_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.consent_at = clock_timestamp();
  return new;
end;
$$;

create trigger profiles_set_consent
  before insert or update of consent_version on public.profiles
  for each row execute function public.profiles_set_consent();
