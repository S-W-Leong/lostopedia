# Contributing

This repository is a single-organization lost-and-found template. Please keep sample configuration fictional, avoid hardcoded deployment identities, and do not add real users, claimant records, credentials, or institution images to tests or seeds. See [deployment](docs/deployment.md) for a fresh local setup and [customization](docs/customization.md) for the configuration contract.

Record notable changes in [CHANGELOG.md](CHANGELOG.md) under `Unreleased`. Keep release versions in `package.json`; do not bump the version for every contribution. See [versions and releases](docs/releases.md) for the maintainer workflow and the existing public baseline.

Before opening a pull request:

```bash
pnpm install --frozen-lockfile
pnpm run setup:organization
pnpm exec tsx scripts/configure-organization.ts --check
pnpm run test:ci
pnpm run lint
pnpm run type-check
pnpm run check:release
```

For database changes, start the isolated `lostopedia-template` local Supabase project, add a timestamped migration with the pinned Supabase CLI, and run `pnpm exec supabase db reset --local` followed by `pnpm exec supabase test db --local`. Never target a linked or production project during local reset. Keep service credentials in ignored environment files. Pull requests should summarize behavior, tests, database/operator impact, and screenshots for visible UI changes.
