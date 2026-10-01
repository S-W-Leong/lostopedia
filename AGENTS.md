# Repository Guidelines

## Project Structure & Module Organization
`src/app` holds Next.js App Router pages, layouts, and API routes. Shared UI lives in `src/components`, reusable business logic in `src/lib`, and client hooks in `src/hooks`. Test helpers live in `src/test`. Static assets belong in `public`, email templates in `templates`, automation or backfill scripts in `scripts`, and Supabase schema work in `supabase/migrations` plus `supabase/functions`. The admin MCP server is isolated under `mcp/lostopedia-admin`.

## Build, Test, and Development Commands
Use `pnpm` for local work:

- `pnpm run dev` starts the Next.js dev server.
- `pnpm run build` creates the production build.
- `pnpm run start` serves the built app.
- `pnpm run lint` runs ESLint across the repo.
- `pnpm run type-check` runs `tsc --noEmit`.
- `pnpm run test:ci` runs Vitest once; `pnpm run test` stays in watch mode.
- `pnpm run test:coverage` generates coverage output.
- `pnpm run mcp:lostopedia-admin` starts the admin MCP stdio server.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation, single quotes, and no semicolons, matching the existing codebase. Prefer the `@/` alias for imports from `src`. Use `PascalCase` for React components, `camelCase` for functions and variables, and kebab-case for docs and migration filenames such as `2026-04-07-admin-remote-mcp-decision-record.md`. Keep route handlers inside the relevant `src/app/api/.../route.ts` path and colocate small helpers near the feature they support.

## Testing Guidelines
Vitest runs in `jsdom` with shared setup from `src/test/setup.ts`. Add tests beside the code they cover using `__tests__/` folders or `*.test.ts(x)` names, for example `src/components/messages/__tests__/MessageInput.test.tsx`. Cover changed validation, API behavior, and UI states before opening a PR. Run targeted tests during development, then finish with `pnpm run test:ci`, `pnpm run lint`, and `pnpm run type-check`.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits: `feat(cache): ...`, `fix(images): ...`, `chore(mcp): ...`. Keep subjects imperative and scoped when helpful. PRs should include a short summary, linked issue or planning doc, test notes, and screenshots for visible UI changes.

Commit relevant, reusable regression tests and their required helpers and fixtures alongside the changes they cover, including database tests under `supabase/tests`. Exclude temporary files, working notes, generated artifacts, one-off verification tests, and scripts from commits unless the user explicitly requests their inclusion. Stage intended application changes, required database migrations, durable tests, and explicitly requested repository guidance by exact file path; avoid blanket staging commands such as `git add .` or `git add -A`. Review the staged file list before committing to confirm excluded files are absent.

Store temporary files, working notes, and local-only verification artifacts in the repository-root `.tmp/` directory. Move one-off verification tests and scripts excluded from the commit into `.tmp/` after verification, preserving their original relative paths. Keep reusable regression tests in their normal test locations and leave existing tracked files in place.

## Security & Configuration Tips
Start from `.env.example` and keep real secrets only in `.env.local`. Never commit API keys, Supabase secrets, or generated credentials. When changing database behavior, add a numbered SQL migration under `supabase/migrations` and document any operator-facing impact in `README.md` or the relevant `docs/` file.
