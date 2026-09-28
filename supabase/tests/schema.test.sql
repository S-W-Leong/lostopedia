begin;
select plan(14);

select has_table('public'::name, 'campuses'::name);
select has_table('public'::name, 'users'::name);
select has_table('public'::name, 'items'::name);
select has_table('public'::name, 'messages'::name);
select has_table('public'::name, 'flags'::name);
select has_table('public'::name, 'notifications'::name);
select has_table('public'::name, 'reputation_events'::name);
select has_table('public'::name, 'deployment_settings'::name);
select has_column('public'::name, 'items'::name, 'pickup_method'::name, 'items include pickup method');
select ok(exists(select 1 from storage.buckets where id = 'avatars' and public), 'public avatars bucket exists');
select ok(exists(select 1 from storage.buckets where id = 'item-images' and public), 'public item-images bucket exists');
select ok(to_regprocedure('public.get_item_geo_json(extensions.geography)') is not null, 'item map conversion exists');
select ok(exists(select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'items_within_radius'), 'nearby search exists');
select ok(to_regprocedure('public.increment_user_items_posted(uuid)') is not null, 'posted-item count refresh exists');

select * from finish();
rollback;
