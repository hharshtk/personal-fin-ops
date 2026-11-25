## Repository layout

An npm-workspaces monorepo. Run `npm install` and the scripts below from this folder.

| Path | What it is | Agent rules |
|---|---|---|
| `apps/web/` | Next.js web app. It also serves the HTTP API under `/api/v1`. | [apps/web/AGENTS.md](apps/web/AGENTS.md) |
| `apps/mobile/` | Expo (React Native) app: one codebase for iOS and Android. | [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md) |
| `packages/core/` | `@myfinancespace/core`, the platform-free domain core both apps import. | [CONSTITUTION.md](CONSTITUTION.md), Article 1 |

Before finishing a change, run `npm run typecheck` and `npm run lint` here. Both cover every workspace, and the core's checks enforce Article 1.

## Mobile compatibility is a requirement

Read [CONSTITUTION.md](CONSTITUTION.md) before you change code. MyFinanceSpace will ship iOS and Android apps that share this product's records, API and domain core. Every change must keep that possible. Before finishing a change, go through the constitution's checklist. If you have to break an article, say which one in your summary and add a row to its gaps table. Never break one silently.
