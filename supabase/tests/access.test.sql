begin;
select plan(18);

select ok(not has_table_privilege('authenticated', 'public.deployment_settings', 'UPDATE'), 'members cannot update settings');
select ok(not has_table_privilege('authenticated', 'public.deployment_settings', 'SELECT'), 'members cannot inspect settings');
select ok(not has_column_privilege('authenticated', 'public.users', 'is_admin', 'UPDATE'), 'members cannot promote themselves');
select ok(not has_column_privilege('authenticated', 'public.users', 'reputation_score', 'UPDATE'), 'members cannot change reputation');
select ok(has_column_privilege('authenticated', 'public.users', 'display_name', 'UPDATE'), 'members can edit display name');
select ok(not has_table_privilege('anon', 'public.items', 'SELECT'), 'guests cannot browse items');
select ok(not has_table_privilege('anon', 'public.users', 'SELECT'), 'guests cannot browse users');
select ok(not has_table_privilege('authenticated', 'public.items', 'SELECT'), 'members do not have broad item select');
select ok(not has_column_privilege('authenticated', 'public.items', 'claimant_name', 'SELECT'), 'claimant names are private');
select ok(not has_column_privilege('authenticated', 'public.items', 'claimant_student_id', 'SELECT'), 'claimant references are private');
select ok(not has_column_privilege('authenticated', 'public.items', 'claimant_recorded_by', 'SELECT'), 'claimant recorders are private');
select ok(has_column_privilege('authenticated', 'public.items', 'title', 'SELECT'), 'item titles stay readable');

delete from public.deployment_settings;
insert into public.campuses(name, slug, country, city, default_latitude, default_longitude)
values ('Test location', 'test-location', 'Example country', 'Example city', 0, 0);
insert into public.deployment_settings(default_campus_id, registration_mode, allowed_email_domains, config_hash)
select id, 'restricted', array['example.org'], 'test' from public.campuses where slug = 'test-location';
insert into auth.users(id, email) values (gen_random_uuid(), 'owner@example.org'), (gen_random_uuid(), 'other@example.org');

select set_config('request.jwt.claim.sub', (select id::text from public.users where email = 'owner@example.org'), true);
set local role authenticated;
select throws_ok('select claimant_name from public.items limit 1', '42501', 'permission denied for table items', 'direct claimant selection is denied');
select throws_ok('update public.users set is_admin = true where id = auth.uid()', '42501', 'permission denied for table users', 'self-promotion is denied');
update public.users set display_name = 'Changed' where email = 'other@example.org';
select lives_ok(format(
  'insert into storage.objects(bucket_id, name, owner_id) values (%L, %L, %L)',
  'avatars', auth.uid()::text || '/avatar.webp', auth.uid()::text
), 'member can upload to own image prefix');
select throws_ok(format(
  'insert into storage.objects(bucket_id, name, owner_id) values (%L, %L, %L)',
  'avatars', (select id::text from public.users where email = 'other@example.org') || '/avatar.webp', auth.uid()::text
), '42501');
reset role;
select is((select display_name from public.users where email = 'other@example.org'), 'other', 'cross-user profile write does not take effect');
select is((select is_admin from public.users where email = 'owner@example.org'), false, 'owner is still a member');

select * from finish();
rollback;
