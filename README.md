# Lostopedia organization template

A lost-and-found application for one organization per deployment. This repository includes the Next.js app, a fresh Supabase schema, Auth email templates, and a scheduled expiration function. The checked-in configuration describes a **fictional Example Community** with registration restricted to `example.org`; replace it before inviting real members.

## Start a fresh installation

Follow [the deployment guide](docs/deployment.md) from the first step. The short version is:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
# Edit config/organization.json and set NEXT_PUBLIC_APP_URL in .env.local.
pnpm run setup:organization
pnpm exec supabase start
pnpm exec supabase db reset --local
# Copy this local project's URL and keys from `pnpm exec supabase status` into .env.local.
set -a
. ./.env.local
set +a
pnpm run check:organization
pnpm run dev
```

`check:organization` needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` exported to the command's environment; the deployment guide shows how to run it from `.env.local`. No users, items, administrators, or passwords are seeded. See [customization](docs/customization.md) for registration, office, location, branding, and configuration updates.

## Current behavior

- Browsing, search, map, and item details require authentication.
- Messaging is paused by default (`MESSAGING_ENABLED = false`). Members can use available profile contact details.
- Admin automation and the MCP endpoint are paused by default (`NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED=false`).
- Images in the `avatars` and `item-images` buckets have public URLs. Only an owner may mutate files under their UUID prefix.
- The sample office has no phone, email, hours, or map link. Configure them before presenting collection instructions.
- Expiration reminders and archival require the separately secured [Edge Function schedule](supabase/functions/item-expiration-cron/README.md).

## Common commands

```bash
pnpm run dev
pnpm run build
pnpm run test:ci
pnpm run lint
pnpm run type-check
pnpm run setup:organization
pnpm exec tsx scripts/configure-organization.ts --check
pnpm run check:release
```

Optional embedding, Redis, image backfill, and admin MCP scripts remain under `scripts/` and `mcp/lostopedia-admin/`. They use each deployment's own credentials and should be enabled only when needed.

## Documentation

- [Deployment and first admin](docs/deployment.md)
- [Configuration and update workflow](docs/customization.md)
- [Member guide](docs/user-side/USER_GUIDE.md)
- [Admin guide](docs/user-side/ADMIN_GUIDE.md)
- [Auth email templates](templates/README.md)
- [Admin MCP adapter](mcp/lostopedia-admin/README.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)

The migrations in this template target **fresh installations**. They do not constitute an upgrade path for an existing operational database.

## License

Lostopedia is licensed under the [Apache License 2.0](LICENSE).
