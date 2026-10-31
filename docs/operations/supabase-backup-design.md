# Optional database backup design

This feature is an operator-configured recovery option for one organization deployment. The template ships the workflow and tests with activation disabled. It provides weekly logical recovery points outside Supabase; it does not provision cloud resources or claim that a particular deployment has passed a recovery drill.

## Pipeline and trust boundaries

1. GitHub Actions runs only reviewed code on the default branch when `SUPABASE_BACKUP_ENABLED=true`; concurrency prevents overlapping jobs.
2. Pinned tools validate the configured hosted project reference, direct/Session connection, PostgreSQL 17, RLS-bypassing export role, supported schemas and encryption requirements.
3. Read-only database sessions use verified TLS with the project's explicit CA certificate. Separate schema/role exports surround one consistent app/Auth/Storage data snapshot; before/after fingerprints detect covered schema changes.
4. The archive records source commit/project, tool versions, table coverage and per-member hashes. It includes repository migrations and matching checked-out organization configuration for recovery reference.
5. age encrypts on the runner using only a public recipient. The private identity stays in the operator's recovery storage.
6. A private R2 bucket receives ciphertext under `lostopedia/database/`. Read-back size/hash verification precedes publication of a completion marker and pruning to eight completed points.

Use a dedicated bucket per deployment. The R2 writer credential needs read/write/list/delete and can destroy backups; immutable/offline copies are a separate design. Repository maintainers able to change the workflow can access the configured runtime credentials. No decryption identity belongs in Actions or R2.

## Coverage and template adaptation

`public` and `private` application definitions/data, Auth users/identities, Storage metadata, sequence state and optional migration history are covered. `private` contains the template's organization-policy and profile/email-verification functions. The inventory/fingerprint includes this schema, and required-table validation includes `campuses` and `deployment_settings`.

The archived `organization.json` is the source configuration at the workflow commit. Compare it with recovered database settings before running the app; it does not prove the live deployment had matching settings. The template's organization comparison command remains the verification step after recovery.

Managed Auth/Storage definitions are captured for review, with only app-owned customizations replayed separately. Auth/Storage platform migration trackers and extension-owned data are excluded. Unknown schemas, nonempty Vault secrets, pgsodium and nonempty vector Storage tables require reviewed recovery support before activation.

Uploaded images, external service settings/secrets, custom role passwords, signing/root keys, and Edge Function deployment are outside this SQL recovery scope. Project URLs change on recovery. Do not promise existing sessions, MFA or encrypted tokens will survive a new-project restore.

## Recovery and validation

Restore into an empty disposable project with compatible PostgreSQL, managed table layouts and extensions. Load roles/app schema/history/data transactionally with trigger suppression, then restore reviewed Auth/Storage customizations. The template's `enforce_organization_registration`, `on_auth_user_created` and `on_auth_user_verified` triggers all matter. Fresh-install migrations and seed execution are a different path from restoring a populated database.

Validation progresses from archive integrity and table coverage to SQL row/sequence comparisons, Auth triggers, grants/RLS, real password login, organization consistency and representative application flows. Synthetic tests cover SQL behavior using fictional data; each operator must establish managed-service recovery for their own deployment. A completion marker proves verified upload, not successful recovery.

## Operations and limits

Weekly successful runs imply approximately seven days of potential data loss; failed/missed runs increase it. Eight successful recovery points are retained rather than expiring every object by age. Check freshness weekly and investigate after eight days without completion. No automatic missed-run monitor, production restore, cutover or recovery-time guarantee is included.

Temporary runner material is deleted on normal exit. Operators must clean up local plaintext and separately retire cloud projects containing restored data after drills. GitHub minutes, R2 usage and Supabase egress depend on actual account usage; free operation is not guaranteed.

Use the [setup runbook](supabase-backup.md), [recovery procedure](supabase-recovery.md), and [drill checklist](supabase-recovery-drill-template.md).
