begin;
select plan(15);

select ok(not has_function_privilege('anon', 'public.map_items_in_bounds(double precision,double precision,double precision,double precision,text,text)', 'EXECUTE'), 'guests cannot call map RPC');
select ok(has_function_privilege('authenticated', 'public.map_items_in_bounds(double precision,double precision,double precision,double precision,text,text)', 'EXECUTE'), 'members can call map RPC');
select ok(not (select prosecdef from pg_proc where oid = 'public.map_items_in_bounds(double precision,double precision,double precision,double precision,text,text)'::regprocedure), 'map RPC uses caller RLS');

delete from public.deployment_settings;
insert into public.campuses(name, slug, country, city, default_latitude, default_longitude)
values ('Map test', 'map-test', 'Example', 'Example', 0, 0);
insert into public.deployment_settings(default_campus_id, registration_mode, allowed_email_domains, config_hash)
select id, 'restricted', array['example.org'], 'test' from public.campuses where slug = 'map-test';
insert into auth.users(id, email) values ('10000000-0000-0000-0000-000000000001', 'map-owner@example.org');

insert into public.items(title, description, type, category, location_text, geo_location, posted_by, campus_id, status, expires_at, deleted_at)
select title, 'Map fixture', type, category, 'Test location',
  case when longitude is null then null else extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography end,
  '10000000-0000-0000-0000-000000000001', c.id, status, expires_at, deleted_at
from public.campuses c cross join (values
  ('inside', 'lost', 'electronics', 101.5::float8, 3.5::float8, 'active', now() + interval '1 day', null::timestamptz),
  ('edge', 'found', 'electronics', 101::float8, 3::float8, 'active', now() + interval '1 day', null::timestamptz),
  ('outside', 'lost', 'electronics', 105::float8, 3.5::float8, 'active', now() + interval '1 day', null::timestamptz),
  ('no coordinates', 'lost', 'electronics', null::float8, null::float8, 'active', now() + interval '1 day', null::timestamptz),
  ('expired', 'lost', 'electronics', 101.5::float8, 3.5::float8, 'active', now() - interval '1 day', null::timestamptz),
  ('deleted', 'lost', 'electronics', 101.5::float8, 3.5::float8, 'active', now() + interval '1 day', now()),
  ('completed', 'lost', 'electronics', 101.5::float8, 3.5::float8, 'completed', now() + interval '1 day', null::timestamptz),
  ('dateline east', 'found', 'electronics', 175::float8, 0::float8, 'active', now() + interval '1 day', null::timestamptz),
  ('dateline west', 'found', 'electronics', -175::float8, 0::float8, 'active', now() + interval '1 day', null::timestamptz)
) as f(title, type, category, longitude, latitude, status, expires_at, deleted_at)
where c.slug = 'map-test';

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select results_eq('select title from public.map_items_in_bounds(3,4,101,102) order by title', array['edge','inside'], 'only active unexpired located items in the viewport, including edges');
select results_eq('select title from public.map_items_in_bounds(3,4,101,102,''lost'',''electronics'')', array['inside'], 'type and category filters apply');
select is((select count(*)::integer from public.map_items_in_bounds(3,4,101,102,null,'documents')), 0, 'category excludes unrelated markers');
select results_eq('select title from public.map_items_in_bounds(-1,1,170,-170) order by title', array['dateline east','dateline west'], 'crossing the antimeridian queries both sides');
select is((select latitude from public.map_items_in_bounds(-1,1,170,-170) limit 1), 0::float8, 'zero latitude is preserved');
select throws_ok('select * from public.map_items_in_bounds(5,4,101,102)', '22023', 'Invalid map bounds', 'reversed latitude is rejected');
select throws_ok('select * from public.map_items_in_bounds(-1,1,181,102)', '22023', 'Invalid map bounds', 'invalid longitude is rejected');
reset role;

-- A temporary restrictive policy proves SECURITY INVOKER respects additional
-- installation-specific RLS, rather than merely filtering deleted rows itself.
create policy "Map test restrict visibility" on public.items as restrictive for select to authenticated using (title <> 'inside');
set local role authenticated;
select results_eq('select title from public.map_items_in_bounds(3,4,101,102)', array['edge'], 'custom RLS hides markers');
reset role;
drop policy "Map test restrict visibility" on public.items;

insert into public.items(title, description, type, category, location_text, geo_location, posted_by, campus_id)
select 'cap ' || n, 'Map fixture', 'found', 'electronics', 'Test',
  extensions.ST_SetSRID(extensions.ST_MakePoint(10, 10), 4326)::extensions.geography,
  '10000000-0000-0000-0000-000000000001', c.id
from public.campuses c cross join generate_series(1, 60) n where c.slug = 'map-test';
set local role authenticated;
select is((select count(*)::integer from public.map_items_in_bounds(9,11,9,11)), 51, 'RPC is capped at 50 plus one overflow sentinel');
select is((select count(*)::integer from public.map_items_in_bounds(20,21,20,21)), 0, 'empty viewport returns no rows');
select throws_ok('select * from public.map_items_in_bounds(''NaN''::float8,11,9,11)', '22023', 'Invalid map bounds', 'nonfinite coordinates are rejected');
reset role;
set local role anon;
select throws_ok('select * from public.map_items_in_bounds(3,4,101,102)', '42501', 'permission denied for function map_items_in_bounds', 'guest invocation denied');
reset role;
select * from finish();
rollback;
