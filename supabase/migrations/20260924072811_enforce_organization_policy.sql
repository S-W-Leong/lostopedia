create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.registration_email_allowed(
  candidate text,
  mode text,
  domains text[]
)
returns boolean
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(candidate));
  domain_part text;
begin
  if candidate is null or length(normalized) > 254 or normalized !~
    '^[^@[:space:][:cntrl:]]+@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  then
    return false;
  end if;
  if length(split_part(normalized, '@', 1)) > 64 then return false; end if;
  domain_part := split_part(normalized, '@', 2);
  return mode = 'open' or domain_part = any(domains);
end;
$$;

create or replace function private.enforce_registration_policy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_mode text;
  domains text[];
begin
  select ds.registration_mode, ds.allowed_email_domains
  into policy_mode, domains
  from public.deployment_settings ds
  join public.campuses c on c.id = ds.default_campus_id and c.is_active = true
  where ds.id = true;
  if not found then
    raise exception 'Organization setup is incomplete: apply the generated seed' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' or new.email is distinct from old.email then
    if not private.registration_email_allowed(new.email, policy_mode, domains) then
      raise exception 'Email address is not allowed by organization registration policy' using errcode = 'P0001';
    end if;
    new.email := lower(btrim(new.email));
  end if;
  if new.email_change is not null and btrim(new.email_change) <> ''
    and (tg_op = 'INSERT' or new.email_change is distinct from old.email_change) then
    if not private.registration_email_allowed(new.email_change, policy_mode, domains) then
      raise exception 'Proposed email address is not allowed by organization registration policy' using errcode = 'P0001';
    end if;
    new.email_change := lower(btrim(new.email_change));
  end if;
  return new;
end;
$$;

create trigger enforce_organization_registration
  before insert or update of email, email_change on auth.users
  for each row execute function private.enforce_registration_policy();

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  location_id uuid;
begin
  select ds.default_campus_id into location_id
  from public.deployment_settings ds
  join public.campuses c on c.id = ds.default_campus_id and c.is_active = true
  where ds.id = true;
  if location_id is null then
    raise exception 'Organization setup is incomplete: active default location is missing' using errcode = 'P0001';
  end if;

  insert into public.users (id, email, display_name, campus_id, email_verified, email_verified_at)
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    location_id,
    new.email_confirmed_at is not null,
    new.email_confirmed_at
  );
  insert into public.notifications (user_id, type, title, message, action_url)
  values (new.id, 'welcome', 'Welcome!', 'Browse items or report something lost or found.', '/dashboard');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists on_auth_user_verified on auth.users;
drop function if exists public.handle_email_verified();
drop function if exists public.handle_user_login();

create or replace function private.handle_email_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.users
    set email_verified = true, email_verified_at = new.email_confirmed_at
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_verified
  after update on auth.users
  for each row
  when (new.email_confirmed_at is not null and old.email_confirmed_at is null)
  execute function private.handle_email_verified();

revoke all on function private.registration_email_allowed(text, text, text[]) from public, anon, authenticated;
revoke all on function private.enforce_registration_policy() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.handle_email_verified() from public, anon, authenticated;
