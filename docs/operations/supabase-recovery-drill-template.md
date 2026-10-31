# Recovery drill record template

Copy this checklist into your deployment's **private operations records**. Leave this public template blank. Never record credentials, private identities, password hashes, tokens, account email addresses or row contents here. Synthetic SQL tests alone are not a managed Supabase recovery drill.

## Recovery point and scope

| Field | Result |
| --- | --- |
| Date/time and operator | |
| Source and isolated target identity (private record only) | |
| Source commit and organization configuration revision | |
| Recovery point/marker and ciphertext integrity | |
| PostgreSQL/extension/managed-schema compatibility | |
| Covered tables, counts and row-comparison method | |
| Exclusions and separately recovered services | |
| Measured duration and what that timing includes | |

## Validation

- [ ] Ciphertext hash/size, decryption, safe extraction and manifest/table coverage verified.
- [ ] Empty isolated target confirmed; outbound integrations disconnected.
- [ ] Transaction committed; roles, schema, Auth/app/Storage metadata, migration history and sequences checked.
- [ ] Private functions and all three template Auth triggers restored; Storage policies reviewed.
- [ ] Restored organization settings agree with archived configuration; target-only `check:organization` passes.
- [ ] Allowed registration creates the correct profile/location; disallowed domains and email changes are rejected; verification updates the profile.
- [ ] Anonymous access denied; authenticated cross-user isolation and representative application queries/writes checked.
- [ ] An existing account's original password works through target Auth; logout/protected-route rejection checked.
- [ ] Realtime, required extensions, permissions and a fresh session's replication role checked.
- [ ] Missing images, external settings, MFA/provider/session limitations and any skipped checks recorded.

## Problems, cleanup and disposition

Record failures, corrections, evidence locations and unresolved checks without raw sensitive diagnostics. Distinguish successful uploads, SQL restores, actual Auth login and full application recovery.

- [ ] Stop temporary apps, close tabs and remove local plaintext, build caches, test credentials and private working files.
- [ ] Preserve encrypted backups and needed decryption identities.
- [ ] Retire/delete the hosted recovery project or explicitly record its owner, access restrictions and retention/deletion date.
- [ ] Confirm the first scheduled backup separately; record measured usage and notification/freshness checks.

Result: **not yet performed / partial / passed for the stated scope**. Production cutover requires a separate deliberate decision after validation.
