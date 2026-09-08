-- Local-only seed (runs on `supabase db reset`, never on `db push`).
-- S6 adds discover profiles here.

-- Test helper (service role only): the stored location as WKT, so the RLS
-- suite can assert the grid-snapping trigger without exposing coordinates.
-- Lives in the seed so the hosted schema carries no coordinate-reading RPC.
create or replace function public.profile_location_text(profile_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select extensions.st_astext(location::extensions.geometry)
    from public.profiles where id = profile_id;
$$;
revoke all on function public.profile_location_text(uuid) from public, anon, authenticated;
