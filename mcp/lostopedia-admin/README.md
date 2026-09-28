# Admin MCP Adapter

Admin automation and this MCP endpoint are paused by default. Enable them only after reviewing the deployment's access controls, token storage, rate limits, and audit logs. Ordinary moderation works through the admin UI.

Adapter and runtime layer that maps MCP tools to the admin automation contract route:

- Contract route: `/api/v1/admin-automation/[operation]`
- Source catalog: `src/lib/contracts/admin/v1/operations.ts`

## Purpose

- Keep one source of truth for operation metadata and input schemas.
- Avoid duplicating business logic in MCP-specific handlers.
- Reuse contract safety semantics (idempotency keys, dry-run/confirm for destructive operations).

## Files

- `tools.ts` - maps contract operations to MCP tool definitions.
- `schema.ts` - converts operation input schemas to host-compatible JSON Schema.
- `server.ts` - invokes contracted route operations and returns machine-usable responses.
- `stdio.ts` - stdio MCP runtime for Claude Code, Cursor, and Claude Desktop.
- `remote.ts` - remote Streamable HTTP runtime helpers for hosted MCP.

## Run locally

Set required env vars, then start the runtime:

```bash
LOSTOPEDIA_BASE_URL="https://example.org" \
LOSTOPEDIA_ADMIN_PAT="token-id.secret" \
pnpm run mcp:lostopedia-admin
```

Notes:

- Replace `https://example.org` with the deployment's canonical HTTPS origin (`NEXT_PUBLIC_APP_URL`).
- Keep PAT values in secret storage, never in committed config files.
- For destructive operations, pass `_dryRun: true` first, then re-run with `_confirmToken`.

## Run remotely (hosted MCP endpoint)

The hosted MCP endpoint is exposed by the app route:

- `POST/GET/DELETE /api/mcp/admin`

Required env vars on the deployed app:

- `LOSTOPEDIA_BASE_URL` (optional; defaults to request origin if omitted)

Required request headers:

- `Authorization: Bearer token-id.secret`

Remote mode preserves the same operation catalog and safety semantics as stdio mode.
