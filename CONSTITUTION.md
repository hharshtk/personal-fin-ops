# MyFinanceSpace Constitution

**Ratified:** 23 Nov 2026 · **Applies to:** every change in this repository, by people or agents · **Changes:** only through [Amendments](#amendments)

MyFinanceSpace will ship as three clients: this web app, an iOS app and an Android app. All three show the same figures and change the same records. This document sets the rules that stop the web app from turning into something only a browser can run.

If a change conflicts with an article, the article wins. If the article is wrong, amend it first in its own change. Don't bend it quietly inside a feature.

[PRODUCT.md](PRODUCT.md) says what we build and for whom. This file says how we build it so the same product can run on iOS and Android.

---

## The target shape

```
   Web app (Next.js)        iOS app        Android app
   apps/web                 └── apps/mobile (Expo) ──┘
          │                    │                │
          └──────────┬─────────┴────────────────┘
                     ▼
          HTTP API  /api/v1        ← the one contract every client shares
                     │
          Services                 ← queries, commands, auth, validation
                     │
          Domain core              ← pure TypeScript: types, rules, calculations, formatting
          packages/core
                     │
          Storage
```

A client may also run the domain core itself, for instant display or offline use. The server's result is still the authoritative one.

**The repository** is one npm-workspaces monorepo. `apps/web` is the Next.js web app and also serves `/api/v1`. `apps/mobile` is one Expo codebase that builds both the iOS and the Android app. `packages/core` is `@myfinancespace/core`, which both apps import.

**Phase 1 (now):** there is no API and no storage. The web app calls the domain core directly, and fixtures stand in for storage. That is fine as long as every call is one that could become an API call without changing what it means. Some articles below only start to bind once the API exists, and they say so.

---

## Articles

### 1. The domain core is platform-free

**Rule.** Everything in `packages/core/` is plain TypeScript: data in, data out. It imports nothing from `react`, `react-native`, `next`, `expo` or any app, and it uses no browser or Node-only globals (`window`, `document`, `localStorage`, `fs`, `process.env`).

**Why.** The core is the one part we reuse unchanged on the server behind the API, in the web client and in the Expo app. Once it depends on the DOM, none of those uses are possible.

- It must run in Node, modern browsers and Hermes (React Native's JavaScript engine). Before using an `Intl` API other than `NumberFormat` or `DateTimeFormat`, confirm that Hermes supports it.
- No module-level mutable state. The same input always gives the same output.
- "Today" is a parameter. A rule never calls `new Date()` or `Date.now()`.
- It takes on runtime dependencies only if they run on all three engines. Say why in the change.
- **Enforced.** The core's `tsconfig.json` loads no DOM or Node types. Its ESLint config rejects imports of UI frameworks, platform modules and apps, reads of the clock, and the `Intl` APIs Hermes lacks. `npm run typecheck` and `npm run lint` fail on a violation.

### 2. Clients display; the core decides

**Rule.** Any logic that decides a money figure, a status, a date, an eligibility or a validation result lives in the core, not in a component.

**Test.** *If the iOS app had to show this same figure or label, would it have to re-implement this code?* If so, the code belongs in `packages/core/`.

Components keep layout, display choices, UI state (open, selected, filtered), focus and motion.

- **Follow this:** `planOccurrencePayment` in [payments.ts](packages/core/src/payments.ts) holds the settlement rule. `usePayOccurrence` in [actions.ts](apps/web/src/components/workspace/actions.ts) only commits the result and shows a toast.
- **Not this:** `statementStatus` in [CreditCards.tsx](apps/web/src/components/views/CreditCards.tsx) decides whether a card statement is paid, due or overdue inside a view.

### 3. Every read is a query, every write is a command

**Rule.** Reads go through named query functions and changes go through named commands. Both take and return JSON-serializable data only.

- **Serializable** means strings, numbers, booleans, `null`, arrays and plain objects. No `Date`, `Set`, `Map`, class instances or functions cross the boundary. A `Set` held inside React state is fine because it never crosses.
- **Names match the future API:** `transactions.create`, `occurrences.pay`, `equityPlans.save`. A command and its endpoint share one name.
- **The creating client supplies the id** of any new record (Article 6). A retried command then never creates a duplicate.
- **Validation lives with the command, in the core.** `validateEquityPlan` in [employee-equity.ts](packages/core/src/employee-equity.ts) is the pattern. Clients may run the same function early for better UX, and the server runs it again.
- **Undo is a command too**, for example deleting the transaction a payment created. A closure that only the web client can run is not enough.
- **Plan, then commit.** Work out the change with a pure function, then apply it. Mobile clients and the server can reuse the pure half.

### 4. The HTTP API is the only door to the backend

*Binds from the first backend change.*

- All client-server traffic goes through versioned JSON endpoints under `/api/v1/`, built as Route Handlers (`apps/web/src/app/api/v1/**/route.ts`). The web app calls those endpoints or the same service functions behind them.
- Server Functions (`"use server"`) and Server Components may serve the web app, but only as thin wrappers over the services the API calls. No capability may exist only as a Server Function or only inside a Server Component. Next.js identifies Server Functions with ids it generates at build time, so a mobile app cannot call them reliably.
- An OpenAPI document describes the API and is checked against the shared types. Mobile clients generate their models from it, not from hand-copied types.
- Auth works with bearer tokens: OAuth 2.1 / OpenID Connect with PKCE for the native apps. The web app may use cookie sessions in addition, but never as the only option.
- Errors use one shape everywhere: `{ "error": { "code", "message", "details"? } }`. The `code` is stable and machine-readable, and clients branch on it, never on `message`.
- Every list endpoint is paginated with cursors from its first version.

### 5. Contracts only grow

**Rule.** Once a field, endpoint, enum value or route ships, it is never renamed, repurposed or given a new type. Changes go in this order: add, deprecate, remove.

**Why.** A web deploy reaches every user within seconds. A mobile release takes days to pass store review, and some people never update. An app version from a year ago must keep working or ask the user to update.

- New fields are optional or get a server-side default.
- Enums are open. Clients handle values they don't recognise with a neutral fallback, so we can add a `TxnType` or `PaymentMethod` without breaking older apps.
- A breaking change needs a new version (`/api/v2`). The API can also declare a minimum supported app version, and every client honours it.
- Until the API schema exists, [types.ts](packages/core/src/types.ts) is the contract. Edit it with the same care.
- URL paths are part of the contract (Article 8). A renamed route ships with a redirect, the way `apps/web/next.config.ts` redirects the old `/liabilities/<card>` paths.

### 6. Data rules

| Concern | Rule |
|---|---|
| **IDs** | Opaque strings. New records get a UUIDv7 from whichever client creates them. Never parse meaning out of an id, and never build one from a counter or from another id. |
| **Calendar dates** | `YYYY-MM-DD` with no time zone (`ISODate`). Months are `YYYY-MM` (`MonthKey`). |
| **Timestamps** | ISO 8601 in UTC with a `Z`, for example `2026-11-23T04:30:00Z`. |
| **"Today"** | One function computes it in the user's time zone (a profile setting, default `Asia/Kolkata`) and passes it into rules. Phase 1 uses the fixed `AS_OF`. |
| **Money** | Always paired with a currency code. On the wire, amounts are integers in minor units (paise). Prices, unit counts and rates that need more precision, such as ESOP/ESPP figures to 8 decimal places, travel as decimal strings. Money arithmetic rounds to minor units through one core helper, never through ad-hoc `toFixed`. |
| **Signs** | Amounts are signed from the owning account's side: positive is money in, negative is money out. `Transaction.amount` already works this way. |
| **Derived figures** | Balances, card outstanding, loan outstanding and net worth are computed from records. No client ever writes them. |
| **Record metadata** | Every stored record has `id`, `createdAt` and `updatedAt`. Deletes are soft (a `deletedAt` tombstone), so a device that was offline still finds out about them. |
| **Codes, not copy** | Records store codes (`kind: "home"`) rather than display text ("Home loan"). Clients map codes to words. Text the user entered, such as names and notes, is stored as entered. |
| **Formatting** | The API returns raw values, never formatted strings. Lakh/crore grouping and date display come from [format.ts](packages/core/src/format.ts), which every client uses or ports exactly. |

### 7. Built to sync before it syncs

People will open the mobile app with no signal. Design today so that adding offline support later is an addition, not a rewrite.

- Commands are idempotent (client-supplied ids, Article 6) and carry everything needed to replay them later.
- An optimistic update runs the same core rule as the server, then takes the server's result as final.
- Ledgers grow by appending. A payment is a new transaction. Undo deletes that transaction; it never edits a balance.
- If two devices edit the same record, the later `updatedAt` wins, unless an article says otherwise for that record type.
- *From the backend onward:* anything that must happen while the app is closed is computed by the server on a schedule, not by a client timer. That covers bill reminders, due and overdue changes, statement generation and push notifications. Clients only display the results. Preferences such as `billReminderDays` are inputs to those jobs.

### 8. Every screen and record has an address

**Rule.** Every screen, and every record a user can open, has a stable URL path. Mobile deep links and push notifications use the same paths, served as universal links on iOS and app links on Android.

- Paths are part of the contract (Article 5).
- A record opened in the inspector needs an address too, for example `?inspect=loan:<id>`, so that a notification can open it directly.
- URL state contains ids and codes, never display text.

### 9. Touch is a first-class input

**Rule.** Every capability can be reached by tapping, on a screen 360 points wide. Keyboard shortcuts, the command palette, hover and right-click make things faster, but none of them is ever the only way to do something.

- Touch targets are at least 44×44 pt (iOS) or 48×48 dp (Android) in touch layouts.
- Nothing is shown on hover only. Chart tooltips and similar details also open on tap or press.
- Web patterns have native counterparts: the inspector becomes a pushed screen or bottom sheet, the command palette becomes search, and a toast with Undo becomes a snackbar. A new pattern needs an obvious mobile form. If it doesn't have one, describe the mobile form in the change.
- Inputs declare their type (`inputMode="decimal"`, date inputs) so the phone shows the right keyboard.

### 10. Design tokens, not values

- Colour, type, spacing, radius and motion come from named tokens, currently the custom properties in [myfinancespace.css](apps/web/src/app/myfinancespace.css). Components don't hard-code hex values or one-off sizes.
- A token means the same thing on every platform. Calendar red is money due, overdue or lost. Pen blue is your own actions, selection and focus. Data series use `--c1` to `--c6`.
- Token names describe purpose (`--ink-2`, `--pen-wash`), not appearance (`--grey-600`). When mobile work starts, the tokens move to one platform-neutral source (JSON) that generates CSS, Swift and Compose values. Semantic names keep that move mechanical.

### 11. Platform capabilities sit behind interfaces

- `apps/web/` is web UI and `apps/mobile/` is phone UI. Each may use its own platform's APIs directly for behaviour only that platform has, such as focus, viewport and print on the web.
- Code meant to be shared, meaning the core and anything that may later be shared, receives platform capabilities through an injected interface. Those capabilities are storage, secure storage, clipboard, share/export, notifications, haptics, biometrics and time.
- Each preference belongs to either the account or the device:
  - **Account** (stored on the profile, synced): number system, financial-year start, week start, bill reminder days, budget alert threshold, default transaction period, show paise.
  - **Device** (stays local): theme, density, rail state.
- Financial data and auth tokens are never stored as plain text in `localStorage` or `AsyncStorage`. On mobile they go in the Keychain (iOS) or Keystore (Android).

### 12. The assistant uses the same doors

- Chat runs through a server endpoint that streams the AI SDK UI message format, which mobile clients can consume too. The swap point is `ChatTransport`; today it is `previewTransport` in [preview-transport.ts](apps/web/src/components/chat/preview-transport.ts).
- No client ever holds a model API key.
- The assistant's tools are the queries and commands from Article 3, with the same validation and the same auth. The assistant gets no back door.
- Every change the assistant makes goes through a command the user can see and undo.

---

## Checklist for every change

Copy into the PR description, or have your agent go through it before finishing.

- [ ] `npm run typecheck` and `npm run lint` pass from the repo root, so nothing in `packages/core/` imports React, Next, React Native or Expo, uses a browser/Node global, reads the clock or calls an `Intl` API Hermes lacks (Art. 1)
- [ ] New money, status, date or validation logic is in `packages/core/`, not in an app (Art. 2)
- [ ] New writes are named commands with serializable input and a client-generated id (Art. 3, 6)
- [ ] No field, enum value or route renamed or repurposed, and new fields are optional (Art. 5)
- [ ] Any new screen or openable record has a URL (Art. 8)
- [ ] Works by touch at 360 pt wide, with nothing shown on hover only, and every shortcut has a visible equivalent (Art. 9)
- [ ] No hard-coded colours or one-off sizes (Art. 10)
- [ ] Any new preference is marked as account-level or device-level (Art. 11)

---

## Where the code stands (23 Nov 2026)

**Already in line**

- `packages/core/` has no React, Next or DOM imports, and its type check and lint enforce that.
- The Expo app in `apps/mobile/` imports the core unchanged, and its Android bundle compiles to Hermes bytecode (`npx expo export --platform android`).
- The core uses a fixed currency list ([currencies.ts](packages/core/src/currencies.ts)) instead of `Intl.supportedValuesOf`, which Hermes lacks. This closed G7.
- `packages/core/src/types.ts` describes records the way an API would return them. Dates are ISO strings handled in UTC.
- Payment settlement is pure and React-free, and it follows the plan-then-commit split (`packages/core/src/payments.ts`).
- Employee-equity validation lives in the core.
- Chat runs through a swappable `ChatTransport`.
- Components contain no hard-coded hex colours, and tokens already have semantic names.
- Theme, density and rail state are stored per device.

**Gaps to close.** Fix each one the next time you touch that code. All must be closed before the first API endpoint ships.

| # | Gap | Article | Where |
|---|---|---|---|
| G1 | Manual transaction ids come from a module-level counter (`m001`, `m002`…). They reset on reload and would collide across devices. | 6 | [state.tsx:116](apps/web/src/components/workspace/state.tsx#L116), [state.tsx:159](apps/web/src/components/workspace/state.tsx#L159) |
| G2 | Occurrence ids are built as `<commitmentId>@<date>`, and `entityName` reads the commitment back out with `split("@")`. | 6 | [ledger.ts:370](packages/core/src/data/ledger.ts#L370), [index.ts:545](packages/core/src/data/index.ts#L545) |
| G3 | Domain rules sit in views: card statement status, transaction type groups and internal-transfer checks, and period ranges. The FY-to-date filter hard-codes April and ignores the `fyStartMonth` preference. "Month N of 12" is hard-coded too. | 2 | [CreditCards.tsx:41](apps/web/src/components/views/CreditCards.tsx#L41), [Transactions.tsx:34-68](apps/web/src/components/views/Transactions.tsx#L34-L68), [Overview.tsx:98](apps/web/src/components/views/Overview.tsx#L98) |
| G4 | Selectors are synchronous, read fixtures at module level, and default their input to the fixture ledger (`txns = TRANSACTIONS`). A real API is asynchronous and per user. Split them into pure calculations that take their data as arguments, plus a data-access layer that fetches that data. | 1, 3 | [data/index.ts](packages/core/src/data/index.ts) |
| G5 | Views import fixture arrays such as `CARDS`, `OCCURRENCES`, `GOALS` and `AS_OF` through `@myfinancespace/core/data`. They need to read through queries instead. | 3 | most of `apps/web/src/components/views/` |
| G6 | Money is a JavaScript float in rupees, and equity rounding uses `toFixed`. | 6 | [types.ts](packages/core/src/types.ts), [employee-equity.ts](packages/core/src/employee-equity.ts) |
| G8 | Policies, goals, assets, commitments and transactions have no URL of their own. `entityHref` falls back to the list page. | 8 | [index.ts:553](packages/core/src/data/index.ts#L553) |
| G9 | Records have no `createdAt`, `updatedAt` or `deletedAt`, and session deletes are hard deletes. | 6, 7 | [types.ts](packages/core/src/types.ts), [state.tsx](apps/web/src/components/workspace/state.tsx) |
| G10 | Account-level preferences live in session-only React state and have no profile to sync to. | 11 | [state.tsx:12-32](apps/web/src/components/workspace/state.tsx#L12-L32) |
| G11 | `POST /api/v1/transcriptions` (voice input) and `GET /api/v1/ai-credits` have no auth and no OpenAPI description. Anyone who can reach a deployment can spend AI Gateway credits and the Groq allowance through the first, and read the gateway balance through the second. Until bearer auth exists, keep deployments behind Vercel Deployment Protection. Add both endpoints to the OpenAPI document when that document is created. | 4 | [transcriptions](apps/web/src/app/api/v1/transcriptions/route.ts), [ai-credits](apps/web/src/app/api/v1/ai-credits/route.ts) |
| G12 | The mobile app has no design tokens, so its placeholder screen uses platform defaults and a light-only theme. Before building the first real mobile screen, move the tokens to one platform-neutral source (JSON) that generates both the web CSS and the app's values. | 10 | [myfinancespace.css](apps/web/src/app/myfinancespace.css), [app.json](apps/mobile/app.json) |

---

## Decisions

The articles above hold whichever way these go. Record each decision as an amendment when it is made.

1. **Mobile stack: decided 23 Nov 2026, React Native with Expo.** One codebase in `apps/mobile/` builds the iOS and Android apps and runs `packages/core/` unchanged, which is why Article 1 exists. Its `android/` and `ios/` folders are generated from `apps/mobile/app.json` (`npm run mobile:native`) and are not committed.
2. **Open: how money is represented inside the core.** The wire format is fixed by Article 6. Inside the core, values could stay floats in rupees with strict rounding, or become integers in paise. Decide before G6 is closed.
3. **Open: where the backend lives.** It could be Route Handlers in this repository or a separate service. For now `apps/web` serves `/api/v1`. A separate service would become `apps/api` and import `packages/core`. Article 4 applies either way.

---

## Amendments

- An amendment is its own change, titled `constitution: <what changes>`. It says what changes and why.
- If an article blocks a change you must ship, say so in the change description, name the article, and add a row to the gaps table with a plan to close it.
- Keep this document short. An article that nobody can check in review gets cut.

**Log**

- **23 Nov 2026 · constitution: decide Expo and adopt the monorepo layout.** Decision 1 is made (Expo). The repository became an npm-workspaces monorepo (`apps/web`, `apps/mobile`, `packages/core`), and the paths in this document follow it. Article 1's "can later move to `packages/core`" test became the enforced package boundary. G7 closed and G12 added.
