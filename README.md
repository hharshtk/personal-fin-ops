# MyFinanceSpace (personal-fin-ops)

A personal finance workstation: one connected workspace for cash, spending, investments, loans, net worth, goals, bills and insurance. It ships as a web app and as iOS and Android apps that share one domain core. **Phase 1 is UI only.** Every figure is synthetic demonstration data, fixed as of **22 Nov 2026**.

## Repository layout

An npm-workspaces monorepo. Install and run everything from the repo root.

| Path | What it is |
|---|---|
| `apps/web/` | The Next.js web app. It also serves the HTTP API under `/api/v1`. |
| `apps/mobile/` | The Expo (React Native) app. One TypeScript codebase builds both the Android and the iOS app. |
| `packages/core/` | `@myfinancespace/core`: types, rules, calculations and formatting in plain TypeScript. Both apps import it, so the web and the phone always show the same figures. |
| `packages/tokens/` | `@myfinancespace/tokens`: colours, type sizes, radii and spacing. `tokens.json` generates the web CSS and the mobile app's values. |

```bash
npm install          # once, from the repo root: installs every app and package
npm run dev          # web app at http://localhost:4000 (PORT comes from apps/web/.env)
npm run typecheck    # every workspace
npm run lint         # every workspace
npm run build        # production build of the web app
npm run tokens       # rebuild the design-token outputs after editing packages/tokens/tokens.json
```

## Domain core (`packages/core`)

| Path | What it holds |
|---|---|
| `src/types.ts` | Domain types (accounts, cards, loans, holdings, goals, commitments, transactions). Written the way a future API would return them. |
| `src/data/core.ts` | Fixture records: profile, accounts, cards, loans, holdings, assets, policies, goals, commitments. |
| `src/data/ledger.ts` | Builds the seeded ledger (May to Nov 2026), card statements derived from card spends, and dated bill occurrences. |
| `src/data/index.ts` | Read-side selectors (balances, loan status, net worth, budgets, attention items, entity names and links). The apps only read through these. |
| `src/transactions.ts` | Transaction filters, periods and totals, and the drafts and validation behind the add form. |
| `src/payments.ts` | Bill status, upcoming bills, and the rules for paying a bill. |
| `src/session-ledger.ts` | The ledger with this session's additions, edits and deletions applied. |
| `src/format.ts` | INR formatting (lakh/crore or million/billion, compact figures) and date helpers. Dates are plain ISO strings handled in UTC, so server, browser and phone render the same. |
| `src/currencies.ts` | The fixed list of currency codes the app accepts. |

Apps import modules by name, for example `@myfinancespace/core/format` or `@myfinancespace/core/data`. The core must run in Node, browsers and Hermes (the phone's JavaScript engine), so its type check rejects browser and Node globals, and its lint rejects React, Next, Expo and React Native imports, reading the clock, and `Intl` APIs Hermes lacks. See `CONSTITUTION.md`, Article 1.

## Web app (`apps/web`)

| Path | What it holds |
|---|---|
| `src/components/shell/` | App shell: rail, top bar, command palette, keyboard shortcuts, theme/density/rail preferences. |
| `src/components/inspector/` | The side inspector (one panel per entity) and the add/edit transaction form. |
| `src/components/views/` | One client view per workspace. Route files in `src/app/**/page.tsx` stay thin. |
| `src/components/calendar/MonthSheet.tsx` | The month calendar used on the overview and in Bills & calendar. |
| `src/components/charts/` | Dependency-free charts (trend line, grouped/stacked columns, segmented bar). |
| `src/app/myfinancespace.css` | Imports the design tokens; component classes, browser-surface theming. |
| `src/app/api/v1/` | HTTP API route handlers. `transcriptions` turns a voice clip into text and reports its cost: Whisper on Groq by default (`GROQ_API_KEY`), or OpenAI and Google models through Vercel AI Gateway (`AI_GATEWAY_API_KEY`). `ai-credits` returns the gateway's credit balance. Keys go in `apps/web/.env.local` (see `apps/web/.env.example`). The supported models, their approximate prices and the request contract are in `packages/core/src/transcription.ts`. You choose the model in Settings › Voice input. |
| `src/components/chat/` | Ask AI panel. Sample replies come from `preview-transport.ts`. The mic button records with `useDictation.ts`, which needs HTTPS or localhost. |

**Deploying.** On Vercel, set the project's **Root Directory** to `apps/web`. Vercel installs from the repo root and builds only the web app.

## Mobile app (`apps/mobile`)

Built with [Expo](https://docs.expo.dev/) SDK 58 and Expo Router. It has five tabs: Overview, Accounts (with a passbook for each account), Transactions (search, filter, add, edit, delete), Bills (month calendar, mark as paid) and More, which is a placeholder. Figures and rules come from the shared core, so they match the web. Changes last until the app closes.

### Try it on your phone (no Android Studio needed)

1. Install **Expo Go** from the Play Store or the App Store.
2. Run `npm run mobile` and scan the QR code: with Expo Go on Android, or with the Camera app on an iPhone. The phone and the computer need to be on the same Wi-Fi network. If they can't be, run `npm run mobile -- --tunnel`.

Saving a file updates the app on the phone within a second or two.

### Build and run with Android Studio

One-time setup: install Android Studio and JDK 17, set `ANDROID_HOME`, and create an emulator, following [Expo's Android Studio guide](https://docs.expo.dev/workflow/android-studio-emulator/).

```bash
npm install
npm run android                                  # builds the app, installs it on the emulator or a USB device, starts the dev server
npm run mobile:native -- --platform android      # only generates apps/mobile/android/, to open in Android Studio
```

To work in Android Studio, choose **File › Open** and pick `apps/mobile/android`. Keep `npm run mobile` running while you run a debug build from Android Studio, because the app loads its JavaScript from that server.

**`android/` and `ios/` are generated, not committed.** They are built from `apps/mobile/app.json` and the installed packages (Expo's Continuous Native Generation). That keeps SDK upgrades simple. To change a native setting (app name, icon, permissions), edit `app.json` and regenerate with `npm run mobile:native -- --clean`. Don't edit the generated folders by hand.

### iOS

`npm run ios` needs a Mac with Xcode. Without a Mac, EAS can build and submit the iOS app in the cloud: `npx eas-cli@latest build --platform ios`.

### Before the first store upload

The app id in `apps/mobile/app.json` is `com.myfinancespace.app` (both `android.package` and `ios.bundleIdentifier`), from the product's domain, `myfinancespace.com`. The Play Store and the App Store don't allow changing it after the first upload.

## Conventions

- **One record, many views.** A loan, holding or account has one id and appears everywhere through selectors, so nothing is counted twice.
- **Colour has one job each.** Calendar red: money due, overdue or lost. Pen blue: your own actions, selection and focus. Data series use the validated `--c1`…`--c6` palette.
- **Session-only edits.** Added or edited transactions and bills marked paid live in React state (`apps/web/src/components/workspace/state.tsx`) and reset on reload. Theme, density and rail state persist in `localStorage`.
- **Cache Components is on.** Pages are prerendered. Anything that reads URL data (`useSearchParams`, dynamic `params`) sits inside a `<Suspense>` boundary with a skeleton fallback.

## Replacing the mock data

Keep the types and the selector signatures in `packages/core/src/data/index.ts`, and swap the fixture sources behind them for API calls. Views do not import fixtures directly.

The rules that keep this codebase compatible with the iOS and Android apps are in `CONSTITUTION.md`. Read them before building anything. Product context is in `PRODUCT.md`. The web app's visual direction is recorded in `apps/web/.impeccable/surfaces/`.
