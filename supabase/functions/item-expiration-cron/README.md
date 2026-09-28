# Item expiration job

This Edge Function sends reminders for active items expiring within seven days, then marks past-due active items expired and notifies their owners. It accepts only `POST` with `Authorization: Bearer <CRON_SECRET>`. The token is separate from the Supabase service-role key. Missing configuration and incorrect tokens return 401 before the function creates a privileged database client; other methods return 405 (apart from harmless `OPTIONS`).

## Deploy and schedule

1. Set a unique `CRON_SECRET` in the function's environment using your deployment's secret store. Keep the application service-role key restricted to the Edge Function runtime.
2. Deploy with `supabase functions deploy item-expiration-cron --project-ref <your-project-ref>`. `supabase/config.toml` sets `[functions.item-expiration-cron] verify_jwt = false` because the independent bearer token is checked by the handler. Supabase's gateway JWT check would otherwise reject this scheduler token before the handler runs.
3. Schedule a daily `POST` using a secured scheduler. For Supabase Cron, enable `pg_cron`, `pg_net`, and Vault in the hosted project, then store the project URL, publishable key, and the same cron token as Vault secrets named `project_url`, `publishable_key`, and `cron_secret`. Run this SQL in the target project after those operator-owned secrets exist:

```sql
select cron.schedule(
  'item-expiration-daily',
  '0 2 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/item-expiration-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

The scheduler and Vault secrets are operator resources; they are not created by template migrations. An alternative hosting scheduler can make the same secured `POST`. The CLI has no `functions deploy --cron` option.

## Local checks

Run `deno test supabase/functions/item-expiration-cron/auth.test.ts`. Serve with `supabase functions serve` and a disposable local `CRON_SECRET`, then verify `GET` returns 405, missing/wrong bearer tokens return 401, and an authorized `POST` returns a processing summary. Use only the local Supabase project for these checks.

The expired-item update changes status, so the next run skips those items. Expiring-soon notifications can repeat on daily runs while an item stays within the seven-day window; the job does not deduplicate them.

See the [Supabase scheduling guide](https://supabase.com/docs/guides/functions/schedule-functions), [function configuration guide](https://supabase.com/docs/guides/functions/function-configuration), and [CLI reference](https://supabase.com/docs/reference/cli/supabase-functions-deploy).
