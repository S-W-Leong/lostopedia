# Template verification

This record covers the fictional checked-in Example Community configuration. It documents local checks; no hosted project was linked, migrated, or deployed.

## Current tree and fresh installation

- The distributable tree excludes local MCP connections, private environment files, inherited institution photographs, superseded operations notes, and the internal readiness audit. The retained public asset is the original text-based `public/template-logo.svg`; no inherited binary image remains in `public/`.
- `pnpm install --frozen-lockfile`, `pnpm exec tsx scripts/configure-organization.ts --check`, and `pnpm run check:release` passed. The release script checked 404 tracked files. An external private denylist scan also passed without displaying the strings.
- Supabase CLI 2.75.0 reset the isolated `lostopedia-template` database from the consolidated migrations and generated seed. Reapplying the seed succeeded. pgTAP passed 38 tests across three files, and `supabase db lint --local --schema public --fail-on error` found no errors. The extension-owned schema is outside that lint scope.
- A second fictional open-registration configuration changed the organization, office, location, and claimant reference. Generated SQL applied to the same database while preserving the default location UUID. The read-only setup comparison passed. The default configuration and generated files were restored, and a final reset left zero synthetic Auth accounts.

## Application checks

- `pnpm run test:ci`: 287 passed, 2 skipped. `pnpm run lint`: 0 errors, 176 existing warnings. `pnpm run type-check`: passed.
- `pnpm run build` passed with placeholder public URL and Supabase values and with service-secret variables removed from the subprocess environment. No production credentials were needed for static generation.
- Browser checks on local development covered the restricted signup copy, guest redirect from discovery, authenticated search, found-item posting, configured location use, required claimant reference on completion, Help office details, empty optional-link handling, page title, and sitemap. The second organization rendered its branding and office details and accepted an address outside the sample restricted domain. Screenshots with synthetic data were saved outside the repository.
- Google Maps displayed its unconfigured-key overlay in this local setup. Posting through the text location field worked. Map rendering with a deployment-specific restricted API key remains unverified.

## Secret and history review

- Gitleaks 8.30.1 was run with full redaction against the pre-release local Git history and a temporary archive of all 404 files in that committed tree. Both scans passed. Two inherited synthetic curl authorization examples were reviewed and excluded by exact finding fingerprints in `.gitleaksignore`; no broad path or rule exclusion was added. The public release was prepared as a fresh initial commit.
- The temporary archive was also checked against the external private denylist: zero matches across 404 files. The small path/content release check is supplemental and does not prove the absence of all credentials.

## Owner decisions and hosted verification

The owner selected Apache License 2.0, confirmed redistribution rights for the bundled assets, chose email and GitHub private vulnerability reporting, and requested a fresh initial history in the existing GitHub repository. Review assets subsequently added and customize privacy and terms text for each deployment. Hosted provisioning, mail delivery, scheduler deployment, and production map keys still require operator verification.
