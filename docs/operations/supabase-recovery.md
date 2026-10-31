# Supabase recovery procedure

Use this procedure to test or prepare recovery from an encrypted R2 backup. Restore into a separate project first. Production recovery requires a deliberate cutover after validation; none of the commands below select production automatically.

See the [design](supabase-backup-design.md), [backup setup](supabase-backup.md) and [blank drill record](supabase-recovery-drill-template.md).

## 1. Prepare a protected working directory

Use a trusted machine with age, Python 3.12+ and PostgreSQL 17 client tools. Run the shell examples in Bash from the repository root. Keep plaintext outside Git and cloud-synced folders.

```bash
umask 077
RECOVERY_DIR="$(mktemp -d /tmp/lostopedia-recovery.XXXXXX)"
chmod 700 "$RECOVERY_DIR"
export RECOVERY_DIR
```

Keep the directory path until cleanup. Obtain your private age identity from its protected recovery location; never put it in an environment file or chat.

## 2. Select and verify the recovery point

Download the `.tar.age` object and matching `.tar.age.complete.json` from the private bucket. Choose a completed point before the unwanted change. Set `BACKUP_ARCHIVE` to the downloaded archive's absolute local path; Cloudflare may rename the download, so do not assume its filename equals the object key.

```bash
export BACKUP_ARCHIVE="/absolute/path/to/download.tar.age"
export BACKUP_MARKER="/absolute/path/to/download.tar.age.complete.json"
python3 - <<'PY'
import hashlib, json, os
from pathlib import Path
archive = Path(os.environ['BACKUP_ARCHIVE'])
marker = json.loads(Path(os.environ['BACKUP_MARKER']).read_text())
digest = hashlib.sha256()
with archive.open('rb') as stream:
    for block in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(block)
assert archive.stat().st_size == marker['size'], 'Ciphertext size mismatch'
assert digest.hexdigest() == marker['sha256'], 'Ciphertext hash mismatch'
print('Ciphertext matches completion marker')
PY
```

Stop if either check fails. A marker and archive from the same writable bucket establish consistency, not an independent tamper-proof signature.

## 3. Decrypt, extract and validate

Replace the identity placeholder with the correct private identity file.

```bash
age -d -i /protected/path/backup.agekey \
  -o "$RECOVERY_DIR/backup.tar.gz" "$BACKUP_ARCHIVE"

python3 - <<'PY'
import os, tarfile
from pathlib import Path
root = Path(os.environ['RECOVERY_DIR'])
with tarfile.open(root / 'backup.tar.gz') as archive:
    for member in archive.getmembers():
        path = Path(member.name)
        assert not path.is_absolute() and '..' not in path.parts
        assert member.isfile() or member.isdir(), 'Links/devices are not permitted'
    archive.extractall(root / 'extracted', filter='data')
PY

python3 scripts/backup/archive.py verify \
  --input-dir "$RECOVERY_DIR/extracted"
```

Do not proceed on an extraction, hash or coverage error. Preserve original extracted files; make reviewed changes in separate working copies.

## 4. Prepare the disposable Supabase project

1. Create a named recovery-test project. Confirm the organization and plan before creation; do not assume a spare free project is available.
2. Record its reference separately from production. Check PostgreSQL major and extension versions against `inventory.json`. Record any differences and test affected functions. Test affected functions whenever versions differ; do not assume patch/extension upgrades are harmless.
3. Keep production SMTP, OAuth, Auth hooks, webhooks and scheduled/network jobs disconnected. Default Supabase email transport may still exist; avoid invite, reset-password and OTP actions during the drill.
4. Disable public signups and the Data API while preparing. This does not make Auth/Storage endpoints network-private; restrict project membership and do not publish its keys or deploy the test app.
5. Confirm the target has no app records, Auth users or bucket metadata before loading. An existing migration-history schema must be reconciled before replaying its definitions.
6. Download the target CA from Database → Settings → SSL configuration. Use it with `verify-full`; system CA bundles alone may not trust Supabase's database CA.

Configure libpq for the **target**, not the source. The password is prompted by psql rather than placed in command history:

```bash
export RECOVERY_PROJECT_REF="<temporary-project-reference>"
export PGHOST="<target-session-pooler-host>"
export PGPORT=5432
export PGUSER="postgres.$RECOVERY_PROJECT_REF"
export PGDATABASE=postgres
export PGSSLMODE=verify-full
export PGSSLROOTCERT="/absolute/path/to/target-ca.crt"
export PGCONNECT_TIMEOUT=15
unset PGPASSWORD PGSERVICE PGSERVICEFILE PGHOSTADDR PGOPTIONS

psql -X --password --set=ON_ERROR_STOP=1 \
  --command="SELECT current_database(), current_user, current_setting('server_version');"
```

Compare the reference, host and username to the target's Connect panel. Use Session pooling on 5432 for IPv4; do not use transaction pooling on 6543. Do not source the application's production `.env.local` for a restore.

## 5. Review the restore inputs

| Input | Required review |
| --- | --- |
| `roles.sql` | Existing roles, platform permissions and separately managed role passwords |
| `schema.sql` | Extensions, owners, grants, RLS, functions, triggers and any outbound endpoints |
| `migration-schema.sql` | Needed before data when migration-history COPY sections are present; reconcile existing target history |
| `data.sql` | Expected tables and source snapshot; retain native COPY and psql framing |
| `managed-schema.sql` | Extract only reviewed app-owned Auth triggers, Storage policies, grants and other custom definitions |
| `inventory.json` | Versions, coverage, exclusions, cron definitions and publication membership |
| `migrations/` | Reference at the backup commit; fresh-install migrations are not a populated-database restore procedure |
| `organization.json` | Archived organization configuration; compare against recovered `deployment_settings` before app verification |

Prepare `$RECOVERY_DIR/managed-customizations.sql` containing only approved customizations, or a comment-only file if none are needed. For this template, review **all three** Auth triggers: `enforce_organization_registration`, `on_auth_user_created` and `on_auth_user_verified`, calling the corresponding `private` functions. The functions belong in the app schema restore; the triggers on managed Auth tables must be reviewed and restored separately. Include the deployment’s app-owned Storage policies and grants. Do not replay the whole managed-schema dump over Supabase's platform tables.

Review source functions and scheduled jobs before executing them. Copying source SMTP/OAuth credentials or enabling outbound jobs is not part of loading SQL.

## 6. Restore transactionally

Use the following only after confirming an empty disposable target and reviewing the inputs. These commands execute DDL and load personal data into the configured target. Stop on any error.

```bash
restore_files=(--file "$RECOVERY_DIR/extracted/roles.sql"
               --file "$RECOVERY_DIR/extracted/schema.sql")
if [ -f "$RECOVERY_DIR/extracted/migration-schema.sql" ]; then
  restore_files+=(--file "$RECOVERY_DIR/extracted/migration-schema.sql")
fi

psql -X --password --single-transaction --set=ON_ERROR_STOP=1 \
  "${restore_files[@]}" \
  --command='SET session_replication_role = replica' \
  --file "$RECOVERY_DIR/extracted/data.sql" \
  --command='SET session_replication_role = origin' \
  --file "$RECOVERY_DIR/managed-customizations.sql"
```

Trigger suppression and data loading must share the same session/transaction. It prevents duplicate Auth-trigger inserts and platform-trigger transformations during loading. If the target cannot set it, resolve the restore permissions rather than ignoring errors. Use SQL files/stdin for COPY; do not paste the data into the dashboard SQL editor or a `psql -c` argument.

A statement failure rolls this transaction back. Confirm rollback/target state before retrying. Do not assume earlier successful COPY messages mean the transaction committed.

**Realtime:** inspect memberships after import. `schema.sql` may already include `ALTER PUBLICATION ... ADD TABLE`; do not add the same tables again. A duplicate publication-add statement can roll back the entire transaction. Restore missing app memberships only after comparing the target, dump and inventory. Leave target-managed Realtime partitions under platform control.

Large numbers of GRANT statements can be slow over a remote connection. The command above uses the original SQL files. Any separately reviewed batching must preserve grant/revoke ordering and final ACL semantics. Do not remove permissions to make a restore faster.

## 7. Verify database recovery

Record results without publishing row contents, password hashes or tokens:

- Compare every covered table's row count against the archive, including empty tables. For stronger evidence, re-export the same source COPY columns and compare order-independent row hashes with duplicates preserved. Match timezone and output formatting.
- Verify Auth users/identities, app profiles and item relationships; compare sequence values and `is_called` state without consuming sequences unnecessarily.
- Check custom Auth triggers, Storage policies, RLS flags, grants and Realtime memberships. Confirm a fresh session uses `session_replication_role=origin`.
- Exercise allowed registration, disallowed domains and email-change rejection, profile/default-location creation, welcome notifications and email-verification triggers using synthetic records in a transaction that is rolled back. Verify the assertions before rolling back. Temporarily enabling public signups is a separate operator action; SQL trigger tests do not require it.
- Test representative PostGIS/vector functions when used by the app.
- Test ordinary anonymous/authenticated roles, not just the administrative restore role. An administrative SELECT bypassing RLS does not establish user isolation.

## 8. Verify Auth and the application

1. Check out the app at the archive’s source commit in a separate local directory. Use the archived `organization.json` as `config/organization.json`; compare `public.deployment_settings` and `public.campuses` with it. Do not apply a fresh-install seed over recovered settings. Set a target-only `NEXT_PUBLIC_APP_URL`; run `pnpm run check:organization` with only target URL/server credentials exported and resolve mismatches deliberately.
2. Use a separate local app directory with its own build cache and environment. Set only the target Supabase URL/publishable key and local app URL. Do not copy production server secrets, shared caches, SMTP or integration credentials. Supply target-only server credentials separately if a tested feature requires them.
3. Before entering credentials, disable Next.js Server Function argument logging in that temporary app with `logging: { serverFunctions: false }`. Development invocation logs may include sign-in arguments; keep them disabled before handling real credentials. Do not publish raw terminal/browser logs.
4. Re-enable the target Data API temporarily for testing under the restored RLS policies. Keep public signups off. Verify anonymous REST requests cannot return private profiles, items or messages.
5. Have an operator sign in through the app with an existing account's original password. Do not reset it: a reset would not prove the backed-up hash works. Verify a new target Auth session and protected page access; a URL redirect alone is insufficient evidence.
6. Check dashboard statistics, own profile/items, search and an item detail. Compare representative results with database expectations. Check one ordinary user cannot read another user's private messages or change another user's records. Distinguish persisted writes from rollback-only SQL tests.
7. Test logout and protected-route rejection. Record unsupported integrations and missing images separately. Do not claim all application flows passed from login alone.

Use one consistent local origin matching the temporary app and target Auth configuration. Switching between `localhost` and `127.0.0.1` requires another login. Missing map/AI/provider credentials or image bytes are separate recovery limits, not proof of database corruption.

## 9. Finish the drill or plan cutover

Record the backup timestamp, source/target versions, row checks, Auth login, app checks, timing, failures and remaining limitations. Disable the temporary Data API again after testing. Stop the local app, close test tabs, remove the private plaintext directory, local test credentials and temporary connection variables. Preserve encrypted backup downloads and the private age identity unless deliberately retiring them. Ordinary deletion is not a guarantee of forensic secure erasure on SSDs or snapshots.

A cloud test project containing restored personal data remains until separately retired. Disable unnecessary access and explicitly arrange its deletion or retention; deleting local files does not remove the hosted copy or revoke all Auth sessions.

For a real incident, validate the target before separately approving cutover: update deployment credentials/URLs, Auth redirects/providers, integrations, Realtime and image URL strategy; reconcile writes after the selected backup and avoid two active writers. Verify the deployed app, then retire the former environment deliberately.

References: [Supabase logical backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [verified database TLS](https://supabase.com/docs/guides/platform/ssl-enforcement).
