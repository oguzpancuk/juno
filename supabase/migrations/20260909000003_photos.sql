-- v1 profile photos and bio.
--
-- Photos live in a private Storage bucket, one folder per user, and are
-- read through signed URLs. The bucket is not public: a public bucket
-- means anyone who ever sees a URL keeps it forever, which is the wrong
-- default for a dating app.
--
-- `profiles.photos` is the ordered list of object paths. Storage cannot
-- be joined efficiently from a view, and discover has to know whether a
-- profile has a photo at all, so the list is denormalised into the row
-- and a trigger keeps it honest.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

alter table public.profiles
  add column bio text check (bio is null or char_length(bio) between 1 and 300),
  add column photos text[] not null default '{}';

/**
 * A profile's photo list: at most six, and every path inside the owner's
 * own folder. The path is what the Storage policies key on, so a row that
 * pointed at someone else's folder would hand out their photos.
 */
create or replace function public.profiles_check_photos()
returns trigger
language plpgsql
as $$
begin
  if cardinality(new.photos) > 6 then
    raise exception 'at most six photos' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from unnest(new.photos) as path
     where path not like new.id::text || '/%'
  ) then
    raise exception 'photos must live in the owner folder'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_check_photos
  before insert or update of photos on public.profiles
  for each row execute function public.profiles_check_photos();

-- ------------------------------------------------------------- storage RLS
-- Writes: only into your own folder, named "<uid>/<anything>".
create policy "photos: write own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "photos: replace own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "photos: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Reads: any signed-in user, except across a block. Discover and the
-- match screen sign URLs for other people's photos, so this cannot be
-- "own folder only"; the block check keeps it off the one pair that must
-- not see each other.
create policy "photos: read unless blocked"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos'
    and not private.is_blocked(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------- discover
-- Unchanged except for the last line: a profile without a photo is not
-- shown to anyone.
create or replace view public.discover
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  extract(year from age(current_date, p.birth_date))::int as age,
  p.gender,
  p.big_three,
  p.chart,
  round(extensions.st_distance(p.location, me.location) / 1000)::int
    as distance_km,
  -- Appended, not inserted: `create or replace view` can only add columns
  -- at the end.
  p.bio,
  p.photos
from public.profiles p
join public.profiles me on me.id = (select auth.uid())
where p.id <> me.id
  and extensions.st_dwithin(p.location, me.location, me.radius_km * 1000)
  and (
    me.interested_in = 'everyone'
    or (me.interested_in = 'women' and p.gender = 'woman')
    or (me.interested_in = 'men' and p.gender = 'man')
  )
  and (
    p.interested_in = 'everyone'
    or (p.interested_in = 'women' and me.gender = 'woman')
    or (p.interested_in = 'men' and me.gender = 'man')
  )
  and not exists (
    select 1 from public.likes l
     where l.from_id = me.id and l.to_id = p.id
  )
  and not private.is_blocked(p.id)
  and not exists (
    select 1 from public.reports r
     where r.reporter_id = me.id and r.reported_id = p.id
  )
  and cardinality(p.photos) > 0;

-- ---------------------------------------------------------- match_profiles
-- A match keeps its thread whatever happens to the photos, so there is no
-- photo condition here; the columns are added so the screen can show them.
create or replace view public.match_profiles
with (security_invoker = false)
as
select
  m.id as match_id,
  m.starter_key,
  m.created_at as matched_at,
  p.id,
  p.display_name,
  extract(year from age(current_date, p.birth_date))::int as age,
  p.gender,
  p.big_three,
  p.chart,
  last.body as last_body,
  last.created_at as last_at,
  last.sender_id as last_sender_id,
  coalesce(unread.n, 0)::int as unread_count,
  p.bio,
  p.photos
from public.matches m
join public.profiles p
  on p.id = case when m.a = (select auth.uid()) then m.b else m.a end
left join lateral (
  select msg.body, msg.created_at, msg.sender_id
    from public.messages msg
   where msg.match_id = m.id
   order by msg.created_at desc, msg.id desc
   limit 1
) last on true
left join lateral (
  select count(*) as n
    from public.messages msg
   where msg.match_id = m.id
     and msg.sender_id <> (select auth.uid())
     and msg.read_at is null
) unread on true
where (select auth.uid()) in (m.a, m.b)
  and not private.is_blocked(p.id);
