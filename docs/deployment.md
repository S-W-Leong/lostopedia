# Deploy one organization

Each deployment needs its own Supabase project and service credentials. Start with a fresh database; these migrations are not a migration path from an older operational Lostopedia database. Use Node.js 24, pnpm, Docker, and the Supabase CLI for the local sequence below.

## Local installation

1. Clone the repository and install the locked dependencies:

   ```bash
   pnpm install --frozen-lockfile
   cp .env.example .env.local
   ```

2. Edit `config/organization.json` for your organization. The checked-in `example.org` registration domain is reserved sample data. Set a real domain or choose open registration as described in [customization](customization.md). Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in the ignored `.env.local` for local work.

3. Generate SQL and Auth email output, then verify generation:

   ```bash
   pnpm run setup:organization
   pnpm exec tsx scripts/configure-organization.ts --check
   ```

4. Start the isolated local Supabase project. `supabase/config.toml` sets `project_id = "lostopedia-template"`; confirm that the local containers use that name before resetting. The reset applies migrations in order, then `supabase/seed.sql`.

   ```bash
   pnpm exec supabase start
   docker ps --filter name=lostopedia-template --format '{{.Names}}'
   pnpm exec supabase db reset --local
   pnpm exec supabase test db --local
   ```

5. Read the local project URL, publishable key, and secret key with `pnpm exec supabase status`. Copy them into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. Keep this file ignored and private. Export its variables for the read-only setup comparison; Next.js loads `.env.local` itself when running the app, while this standalone script needs an exported environment:

   ```bash
   set -a
   . ./.env.local
   set +a
   pnpm run check:organization
   pnpm run dev
   ```

6. Open `http://localhost:3000`, sign up with an address allowed by your configured policy, and verify that the account exists in Auth and `public.users`. Local Auth confirmation settings may mark accounts confirmed immediately; inspect `auth.users.email_confirmed_at` before promotion. No account or admin password is seeded. To make **that exact verified account** the first administrator, connect as the database operator and run a guarded transaction with the actual UUID you just verified:

   ```sql
   begin;
   do $$
   declare changed integer;
   begin
     update public.users set is_admin = true where id = '<verified-user-uuid>'::uuid;
     get diagnostics changed = row_count;
     if changed <> 1 then
       raise exception 'Expected exactly one administrator row; changed %', changed;
     end if;
   end $$;
   select id, email, is_admin from public.users where id = '<verified-user-uuid>'::uuid;
   ```

   Confirm the returned email belongs to the intended account, then run `commit;` in the same session. Run `rollback;` if it does not. Use the local database URL from `pnpm exec supabase status`; do not paste credentials into tracked files.

## Hosted installation

1. Create a new Supabase project for the organization. Provision Auth, Postgres, Storage, and the `vector` and PostGIS extensions supported by the migrations. Apply `supabase/migrations/` in timestamp order to the **new** project (for example, link your own project and use `pnpm exec supabase db push`). Apply the freshly generated `supabase/seed.sql` through an operator connection after migrations. The seed is safe to reapply when configuration changes; it updates the existing default location by UUID.
2. Set the application's Supabase URL, publishable key, and server-side secret key in your hosting environment. Never expose `SUPABASE_SECRET_KEY` to client code. Set `NEXT_PUBLIC_APP_URL` to one HTTPS root origin and use the same origin as the Supabase Auth Site URL. Allow `/auth/callback` and `/auth/callback?next=/update-password` in Auth redirect URLs. Redirect alternate domains to the canonical host before PKCE authentication. Export credentials for `pnpm run check:organization` against the intended project before opening registration.
3. Configure custom SMTP and review all six [generated Auth email templates](../templates/README.md) in the hosted Supabase dashboard. Local `config.toml` template paths do not automatically publish hosted Auth templates. Confirm sender identity, Auth Site URL, invitation, signup, password reset, and email-change flows with a real test mailbox.
4. The `avatars` and `item-images` buckets use public image URLs. Database policies restrict upload, replacement, and deletion to the authenticated user's UUID path prefix. Do not treat image URLs as private. Configure the optional Google Maps key with HTTP referrer and API restrictions. Embedding suggestions need a Hugging Face key; optional Redis keys enable shared caching and rate limiting. The app remains usable with those optional integrations absent, though matching or map features may be limited.
5. Create and verify the first real member, then perform the guarded administrator promotion above as database operator. If you want account deletion to retain listings/messages, provision a separate dedicated system user and set `LOSTOPEDIA_SYSTEM_USER_ID` to its UUID. Otherwise the deletion flow requires deleting that content; no system user is supplied by the template.
6. Deploy and schedule the [authenticated expiration function](../supabase/functions/item-expiration-cron/README.md) with a separate `CRON_SECRET`. Store scheduler credentials in a secret store such as Supabase Vault. There is no default schedule or cron secret.

After changing public configuration, run `pnpm run setup:organization`, apply the generated SQL to the intended project, update hosted Auth email templates, rebuild/redeploy the app, and run `pnpm run check:organization`. The setup comparison detects stale hashes and changed location fields. Review [privacy](<../src/app/(main)/privacy/page.tsx>) and [terms](<../src/app/(main)/terms/page.tsx>) for your jurisdiction and operating organization before publication.
