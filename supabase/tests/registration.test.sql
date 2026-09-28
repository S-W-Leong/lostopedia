begin;
select plan(6);

delete from public.deployment_settings;
insert into public.campuses(name, slug, country, city, default_latitude, default_longitude)
values ('Test registration location', 'test-registration', 'Example country', 'Example city', 0, 0);
insert into public.deployment_settings(default_campus_id, registration_mode, allowed_email_domains, config_hash)
select id, 'restricted', array['example.org'], 'test' from public.campuses where slug = 'test-registration';

select lives_ok(
  $$insert into auth.users(id, email) values (gen_random_uuid(), 'member@example.org')$$,
  'an exact-domain member may sign up'
);
select is(
  (select campus_id from public.users where email = 'member@example.org'),
  (select id from public.campuses where slug = 'test-registration'),
  'profile uses configured location'
);
select throws_ok(
  $$insert into auth.users(id, email) values (gen_random_uuid(), 'member@example.org.evil.test')$$,
  'P0001'
);
select throws_ok(
  $$update auth.users set email_change = 'member@evil.test' where email = 'member@example.org'$$,
  'P0001'
);

update public.deployment_settings set registration_mode = 'open', allowed_email_domains = '{}';
select lives_ok(
  $$insert into auth.users(id, email) values (gen_random_uuid(), 'reader@another.example')$$,
  'open registration allows another valid domain'
);

delete from public.deployment_settings;
select throws_ok(
  $$insert into auth.users(id, email) values (gen_random_uuid(), 'new@example.org')$$,
  'P0001'
);

select * from finish();
rollback;
