-- Rectangular Maps viewports use planar longitude/latitude bounds. The existing
-- geography index remains useful for radius searches; this expression index
-- supports exact rectangles without geography's curved edges at large zooms.
create index idx_items_map_bounds on public.items
using gist ((geo_location::extensions.geometry))
where geo_location is not null and deleted_at is null;

create or replace function public.map_items_in_bounds(
  p_south double precision,
  p_north double precision,
  p_west double precision,
  p_east double precision,
  p_type text default null,
  p_category text default null
)
returns table (
  id uuid,
  type text,
  title text,
  latitude double precision,
  longitude double precision
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_south is null or p_north is null or p_west is null or p_east is null
    or not (p_south >= -90 and p_north <= 90 and p_south < p_north)
    or not (p_west >= -180 and p_west <= 180 and p_east >= -180 and p_east <= 180)
    or p_west = p_east then
    raise exception 'Invalid map bounds' using errcode = '22023';
  end if;

  return query
  select i.id, i.type, i.title,
    extensions.ST_Y(i.geo_location::extensions.geometry),
    extensions.ST_X(i.geo_location::extensions.geometry)
  from public.items i
  where i.deleted_at is null
    and i.status = 'active'
    and i.expires_at > now()
    and i.geo_location is not null
    and (p_type is null or i.type = p_type)
    and (p_category is null or i.category = p_category)
    and (
      (p_west < p_east and i.geo_location::extensions.geometry operator(extensions.&&)
        extensions.ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326))
      or (p_west > p_east and (
        i.geo_location::extensions.geometry operator(extensions.&&)
          extensions.ST_MakeEnvelope(p_west, p_south, 180, p_north, 4326)
        or i.geo_location::extensions.geometry operator(extensions.&&)
          extensions.ST_MakeEnvelope(-180, p_south, p_east, p_north, 4326)
      ))
    )
  order by i.created_at desc, i.id
  -- 50 markers and one sentinel. Callers cannot request an unbounded result.
  limit 51;
end;
$$;

revoke all on function public.map_items_in_bounds(double precision, double precision, double precision, double precision, text, text) from public, anon;
grant execute on function public.map_items_in_bounds(double precision, double precision, double precision, double precision, text, text) to authenticated;
