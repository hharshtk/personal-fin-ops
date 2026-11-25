<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Web app

Part of the MyFinanceSpace monorepo. Read the [root AGENTS.md](../../AGENTS.md) and [CONSTITUTION.md](../../CONSTITUTION.md) first.

- Money, status, date and validation logic goes in `packages/core` (`@myfinancespace/core`), not in a component here (Article 2). The iOS and Android apps import the same core.
- `@/` imports resolve to `apps/web/src/`. Import the core by package name, for example `@myfinancespace/core/format`.
- Every capability the web app gets from the server must also be reachable through `/api/v1` (Article 4), because the mobile apps can only use that door.
