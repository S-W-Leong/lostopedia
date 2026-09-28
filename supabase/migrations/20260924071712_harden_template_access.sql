-- Public profiles are visible to signed-in members, but profile mutations are
-- confined to ordinary editable fields. Signup profiles are created by Auth.
drop policy if exists "Admins can view all users" on public.users;
drop policy if exists "Admins can update any user" on public.users;
drop policy if exists "Users can insert own profile" on public.users;

revoke all on public.users from public, anon, authenticated;
grant select on public.users to authenticated;
grant update (display_name, phone, avatar_url, updated_at)
  on public.users to authenticated;

alter table public.deployment_settings enable row level security;
revoke all on public.deployment_settings from public, anon, authenticated;
grant all on public.deployment_settings to service_role;

-- Public image URLs are part of the current application contract. Mutation and
-- listing through the Storage API remain confined to the caller's UUID prefix.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('item-images', 'item-images', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

create policy "Members can list own template images"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('avatars', 'item-images')
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "Members can upload own template images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'item-images')
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "Members can replace own template images"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'item-images')
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'item-images')
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "Members can remove own template images"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'item-images')
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

-- RPCs used by map views and posting. They were present only in the hosted
-- database in the inherited project, so a fresh installation needs them here.
create or replace function public.get_item_geo_json(item_geo extensions.geography)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select extensions.ST_AsGeoJSON(item_geo)::jsonb;
$$;
revoke all on function public.get_item_geo_json(extensions.geography) from public, anon;
grant execute on function public.get_item_geo_json(extensions.geography) to authenticated;

create or replace function public.items_within_radius(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision,
  p_type text default null,
  p_category text default null,
  p_limit integer default 50
)
returns table (
  item_id uuid,
  item_type text,
  title text,
  description text,
  category text,
  image_url text,
  location_text text,
  pickup_method text,
  geo_location extensions.geography,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  poster_id uuid,
  poster_name text,
  poster_avatar text,
  poster_reputation integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select i.id, i.type, i.title, i.description, i.category, i.image_url,
    i.location_text, i.pickup_method, i.geo_location, i.status,
    i.created_at, i.expires_at, u.id, u.display_name, u.avatar_url,
    u.reputation_score
  from public.items i
  join public.users u on u.id = i.posted_by
  where i.deleted_at is null
    and i.status = 'active'
    and i.expires_at > now()
    and i.geo_location is not null
    and (p_type is null or i.type = p_type)
    and (p_category is null or i.category = p_category)
    and extensions.ST_DWithin(
      i.geo_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography,
      p_radius_meters
    )
  order by extensions.ST_Distance(
    i.geo_location,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
  )
  limit p_limit;
$$;
revoke all on function public.items_within_radius(double precision, double precision, double precision, text, text, integer) from public, anon;
grant execute on function public.items_within_radius(double precision, double precision, double precision, text, text, integer) to authenticated;

create or replace function public.increment_user_items_posted(user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from user_id then
    raise exception 'Not authorized to refresh this count' using errcode = '42501';
  end if;
  update public.users u
  set total_items_posted = (
    select count(*)::integer from public.items i
    where i.posted_by = user_id and i.deleted_at is null
  )
  where u.id = user_id;
end;
$$;
revoke all on function public.increment_user_items_posted(uuid) from public, anon;
grant execute on function public.increment_user_items_posted(uuid) to authenticated;
