# Customize the organization

Edit the validated public configuration in `config/organization.json`. It contains no service secrets and describes one organization per deployment. The sample uses the fictional Example Community and the reserved `example.org` domain.

| Field | Use |
| --- | --- |
| `name`, `organizationName`, `description`, `logoPath` | Application identity, metadata, email branding, and an adopter-hosted root-relative logo asset. Replace `public/template-logo.svg` or set a different local path. |
| `supportEmail`, `memberLabel` | Help/legal contact and member-facing copy. |
| `location` | Default posting location, coordinates, zoom, city, and country. |
| `office` | Collection name/address and optional phone, email, hours, and HTTPS map URL. Missing optional values render no empty links. |
| `claimantReference` | Label and whether a claimant reference is required when completing a found item. Internal `claimant_student_id` fields retain their names for compatibility. |
| `registration` | `restricted` with exact email domains or `open` for any syntactically valid email. Addresses are trimmed and compared without case. Suffix lookalikes do not match. |

The default location's database UUID stays the same when its display name or slug changes. The generator updates the referenced row rather than adding a second location. A conflicting slug causes the SQL transaction to fail. The registration rule is enforced by Auth database triggers as well as the app; a stale or missing `deployment_settings` row rejects registration.

After editing configuration:

```bash
pnpm run setup:organization
pnpm exec tsx scripts/configure-organization.ts --check
```

Apply `supabase/seed.sql` to the intended deployment through an operator connection, update the hosted Auth email templates from `templates/`, rebuild/redeploy the app, and run `pnpm run check:organization` with that deployment's URL and secret key exported. The check reports mismatched field names and never changes the database. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin in production; alternate hosts should redirect to it before authentication. Local development can use `http://localhost:3000`.

Review `src/app/(main)/privacy/page.tsx` and `src/app/(main)/terms/page.tsx`, support policies, Auth sender identity, storage visibility, moderation policy, and location/collection instructions before public release. The included legal text is generic product copy and needs operator review.
