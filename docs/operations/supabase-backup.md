# Optional weekly Supabase backups

This template includes an **opt-in** database/Auth backup pipeline. It is disabled until an operator configures their own credentials and sets `SUPABASE_BACKUP_ENABLED=true`. Installing the template does not provision R2, enable backups, or establish that your deployment can be recovered.

See the [design and limitations](supabase-backup-design.md), [recovery procedure](supabase-recovery.md), and [blank drill record](supabase-recovery-drill-template.md). Keep completed drill records containing deployment details in your own private operations records.

## Behavior and coverage

The workflow runs Saturdays at **19:17 UTC** (`17 19 * * 6`) or manually. Change the schedule to suit your deployment. Both paths require the repository's default branch and `SUPABASE_BACKUP_ENABLED=true`. Concurrency prevents overlapping jobs, with at most one pending run. The job times out after 15 minutes. GitHub can delay or drop scheduled jobs.

| Archive member | Purpose |
| --- | --- |
| `roles.sql` | Supabase-filtered custom roles, without custom role passwords |
| `schema.sql` | App schema including `private` functions, grants, RLS and policies |
| `data.sql` | One PostgreSQL snapshot of ordinary tables in `public`, `private`, `auth`, `storage` and optional `supabase_migrations`, including empty tables and sequence state |
| `managed-schema.sql` | Auth/Storage definitions for reference and separately reviewed customizations; never replay wholesale |
| `migration-schema.sql` | Optional migration-history schema; reconcile with the target before replay |
| `inventory.json` | Coverage, exclusions, versions, extensions, roles, publications, schema fingerprint and available cron definitions |
| `organization.json` | The checked-out `config/organization.json`, for restoring matching organization configuration |
| `migrations/` | Repository migration files at the source commit, as reference |
| `tools.json`, `manifest.json` | Tool versions, source commit/project, timestamp, coverage and member hashes |

Auth users, password hashes, identities, application profiles, `campuses` and `deployment_settings` are included. Required-table checks reject missing organization-setting tables. Unknown schemas fail closed until reviewed. All covered tables must have complete COPY sections, including empty tables. The export role must bypass RLS to avoid silently omitting private records.

**Not included:** uploaded Storage file bytes; dashboard/Auth configuration; OAuth/SMTP credentials; API/signing keys; Edge Function secrets and code deployment; other external services. Storage metadata does not recover photos. New project URLs also differ, so stored absolute image URLs need a separately reviewed recovery strategy. Existing sessions, MFA and encrypted provider tokens are not guaranteed to work in a new project.

Auth/Storage platform migration trackers and extension-owned tables are excluded. Vector Storage tables are excluded and must be empty. A nonempty `vault.secrets` table or the `pgsodium` extension causes the job to refuse export: this pipeline does not implement their key/secret recovery. The deployment guide permits Vault for scheduler secrets; if you use it, do not enable this pipeline unchanged. Arrange a reviewed encrypted-secret recovery design and corresponding tooling/tests first, or use a separately managed scheduler secret store and recover its configuration separately. Do not delete live Vault data or weaken the guard to make a backup pass.

## Operator setup

1. Use your **own deployment repository** and Supabase project. Keep `SUPABASE_BACKUP_ENABLED` absent or `false` during preparation. Run `pnpm run check:organization` against the intended deployment and commit matching organization configuration before backup. The archived configuration comes from Git; the database settings come from the database snapshot.
2. Create a dedicated **private R2 Standard bucket for this deployment**. Leave public `r2.dev` access and custom public domains disabled. Use one bucket per deployment: the tooling intentionally uses the fixed prefix `lostopedia/database/`; sharing it between projects would mix retention inventories. Keep complete-object lifecycle expiration disabled so prolonged failures cannot age out every old backup. Incomplete-multipart cleanup is appropriate.
3. Create an R2 S3 token restricted to that bucket, with list/read/write/delete access. The writer can delete backups; this is not immutable storage or ransomware protection.
4. Generate a native age identity on a protected machine: `age-keygen -o /protected/path/backup.agekey`. Obtain the public recipient with `age-keygen -y /protected/path/backup.agekey`. Keep the private identity in a password manager and another protected recovery location. Never put it in Git, Actions, R2 or chat. Preserve old identities while their backups remain needed.
5. Obtain your project's direct or **Session pooler** PostgreSQL URL on port **5432** from its Connect panel. Session pooling works on IPv4 runners. Transaction pooling on 6543 is rejected. URL-encode reserved password characters. Confirm the source is **PostgreSQL 17** and the export role can bypass RLS and read Auth/Storage tables. Other PostgreSQL majors require a reviewed tooling/test update.
6. Download this project's PEM CA certificate from Database Settings → SSL Configuration. The script validates it, forces `sslmode=verify-full`, writes a mode-600 temporary CA file and removes it after the run. Database sessions use read-only transactions and connection/statement/lock timeouts. Do not run migrations or change database grants during backup: schema and role exports are separate transactions from the data snapshot; before/after fingerprints are a guard rather than an atomic whole-project snapshot.
7. Configure the following under your deployment repository's Settings → Secrets and variables → Actions. These are operator settings, not browser variables or application `.env.example` values.

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `SUPABASE_BACKUP_DB_URL` | Complete Session/direct PostgreSQL URL |
| Secret | `SUPABASE_BACKUP_CA_CERT` | Complete source CA PEM, including header/footer and real line breaks |
| Secret | `BACKUP_AGE_RECIPIENT` | Public native `age1...` recipient; never the private identity |
| Secret | `R2_ACCESS_KEY_ID` | Bucket-scoped S3 access ID |
| Secret | `R2_SECRET_ACCESS_KEY` | Matching S3 secret |
| Variable | `SUPABASE_BACKUP_PROJECT_REF` | Expected 20-letter hosted project reference; validated against the database URL |
| Variable | `R2_ENDPOINT_URL` | `https://<32-character-account-id>.r2.cloudflarestorage.com`, without trailing slash |
| Variable | `R2_BUCKET` | Dedicated private bucket name |
| Variable | `SUPABASE_BACKUP_ENABLED` | Absent/`false` until preflight succeeds; exactly `true` to activate |

No Supabase service key or personal access token is required by the backup workflow. Measure account-wide Actions usage, R2 storage/operations and Supabase egress; the template does not promise free operation. Eight retained archives plus incomplete uploads and other account usage consume storage.

## Tooling and verification

`install-tools.sh` targets Ubuntu 24.04 x86_64 hosted runners. It checksum-pins Supabase CLI **2.75.0**, age **1.2.1**, AWS CLI **2.32.11**, and the PGDG signing key; PostgreSQL client **17.11-1.pgdg24.04+2** comes from signed PGDG packages. Review pins and hashes together when releases/packages change; never silently substitute an arbitrary version. Transitive system dependencies still receive signed APT updates.

CLI dry-run templates supply Supabase's role/schema filtering using a dummy URL. Real credentials are supplied only to the native PostgreSQL commands through private environment variables; Docker and project linking are not required for backups. Pinned template changes require export/restore regression tests.

Offline checks require Python 3.12+ and Bash:

```bash
python3 -m unittest discover -s scripts/backup/tests -p 'test_*.py' -v
bash -n scripts/backup/backup.sh scripts/backup/install-tools.sh
```

The separate `Backup tooling tests` workflow runs offline and synthetic PostgreSQL/age tests without production secrets. To run integration tests locally, provide an **isolated** PostgreSQL 17 instance at `127.0.0.1:55439`, trust authentication and an OS-named superuser, with PostgreSQL 17 tools, Supabase CLI 2.75.0, age/age-keygen and AWS CLI on PATH:

```bash
BACKUP_TEST_POSTGRES=1 python3 -m unittest discover -s scripts/backup/tests -p 'test_*.py' -v
```

The fixture creates/drops temporary databases and may create roles `postgres`, `anon` and `authenticated`. Never point it at a real deployment. It tests the actual template registration migration against synthetic managed tables, including domain rejection, email changes, profile creation and email verification. It also checks private-schema coverage and concurrent function-change detection. Simulated S3 transport does not prove real R2 permissions or networking; production uses AWS CLI's normal paginator. Synthetic SQL tests do not prove managed Supabase Auth login.

## Activation and first recovery point

- Pass synthetic tests on the actual Linux runner; inspect source version, schema, extensions and key-recovery needs.
- Test synthetic export/restore into an isolated managed Supabase environment before enabling production exports, including registration policy, profile creation, RLS and password login.
- Configure your own credentials, merge the reviewed workflow into your default branch, set `SUPABASE_BACKUP_ENABLED=true`, then dispatch one manual run. Manual runs use the same activation gate.
- Download the completed ciphertext/marker pair, verify and decrypt it, then follow the [recovery procedure](supabase-recovery.md) in a separate protected project. Record what was actually validated and clean up hosted as well as local test data. If this drill fails, disable the gate while resolving it.
- Confirm the first scheduled run separately. Enable your own Actions failure notifications and check their delivery.

Keep app data restored from backup separate from fresh-install migrations/seed execution. Applying a new generated seed during recovery could overwrite the registration policy you are trying to recover.

## Routine operation and failures

Only ciphertext and a small completion marker are uploaded. Each uploaded archive is downloaded and compared by size and SHA256 before its marker is published. Retention keeps the newest **eight validated completed archive/marker pairs**, and only prunes after the new upload is verified. It deletes an old archive before its marker. A retention failure can leave a valid new recovery point while the workflow reports failure.

Check the most recent completion weekly; investigate when no completed point exists within **eight days**. Failure notifications cannot detect a schedule that never started. Independent missed-run monitoring is not included. A weekly schedule permits roughly seven days of data loss when runs succeed; missed runs extend it. There is no guaranteed recovery time. Take a manual backup before risky maintenance when appropriate.

On failure, verify the last completed pair, resolve the stage-specific configuration/connectivity/coverage issue and retry on the default branch. Logs deliberately suppress raw diagnostics and database contents. Do not paste secrets, hashes or raw command output into public issues. Unmarked archive objects are not completed recovery points; review them privately before operator cleanup. Do not add an independent age-based expiration rule for completed backups.

On normal exit, temporary plaintext is deleted; forced runner termination relies on hosted runner disposal. Preserve decryption identities separately. Repository access and the R2 writer credential remain significant trust boundaries.

References: [Supabase logical backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [R2 pricing](https://developers.cloudflare.com/r2/pricing/).
