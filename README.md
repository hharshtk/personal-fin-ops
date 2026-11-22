# Arthashala (personal-fin-ops)

A personal finance workstation: one connected workspace for cash, spending, investments, loans, net worth, goals, bills and insurance. **Phase 1 is UI only.** Every figure is synthetic demonstration data, fixed as of **22 Nov 2026**.

```bash
npm install
npm run dev        # http://localhost:4000 (PORT comes from .env)
npm run lint
npx tsc --noEmit
npm run build
```

## Where things live

| Path | What it holds |
|---|---|
| `src/lib/types.ts` | Domain types (accounts, cards, loans, holdings, goals, commitments, transactions). Written the way a future API would return them. |
| `src/lib/data/core.ts` | Fixture records: profile, accounts, cards, loans, holdings, assets, policies, goals, commitments. |
| `src/lib/data/ledger.ts` | Builds the seeded ledger (May to Nov 2026), card statements derived from card spends, and dated bill occurrences. |
| `src/lib/data/index.ts` | Read-side selectors (balances, loan status, net worth, budgets, attention items, entity names and links). The UI only reads through these. |
| `src/lib/format.ts` | INR formatting (lakh/crore or million/billion, compact figures) and date helpers. Dates are plain ISO strings handled in UTC, so server and browser render the same. |
| `src/components/shell/` | App shell: rail, top bar, command palette, keyboard shortcuts, theme/density/rail preferences. |
| `src/components/inspector/` | The side inspector (one panel per entity) and the add/edit transaction form. |
| `src/components/views/` | One client view per workspace. Route files in `src/app/**/page.tsx` stay thin. |
| `src/components/calendar/MonthSheet.tsx` | The month calendar used on the overview and in Bills & calendar. |
| `src/components/charts/` | Dependency-free charts (trend line, grouped/stacked columns, segmented bar). |
| `src/app/arthashala.css` | Design tokens (light and dark), component classes, browser-surface theming. |

## Conventions

- **One record, many views.** A loan, holding or account has one id and appears everywhere through selectors, so nothing is counted twice.
- **Colour has one job each.** Calendar red: money due, overdue or lost. Pen blue: your own actions, selection and focus. Data series use the validated `--c1`…`--c6` palette.
- **Session-only edits.** Added or edited transactions and bills marked paid live in React state (`src/components/workspace/state.tsx`) and reset on reload. Theme, density and rail state persist in `localStorage`.
- **Cache Components is on.** Pages are prerendered. Anything that reads URL data (`useSearchParams`, dynamic `params`) sits inside a `<Suspense>` boundary with a skeleton fallback.

## Replacing the mock data

Keep the types and the selector signatures in `src/lib/data/index.ts`, and swap the fixture sources behind them for API calls. Views do not import fixtures directly.

Product context is in `PRODUCT.md`. The visual direction is recorded in `.impeccable/surfaces/`.
