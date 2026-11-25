This is the Expo/React Native app for iOS and Android. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

It is part of the MyFinanceSpace monorepo. Read the [root AGENTS.md](../../AGENTS.md) and [CONSTITUTION.md](../../CONSTITUTION.md) first.

## Share the core, never copy it

- Figures, statuses, dates and validation come from `@myfinancespace/core` (for example `@myfinancespace/core/format`). If a screen needs a rule the core doesn't have, add it to `packages/core`, not to this app (Article 2).
- The core runs on Hermes, so it may only use the `Intl` APIs Hermes implements. `packages/core/eslint.config.mjs` lists the ones it lacks.
- Data will come from the HTTP API (`/api/v1`, Article 4). Until then, screens may read the core's fixtures.
- Colours and sizes come from design tokens (Article 10). They don't exist for mobile yet (gap G12), so don't hard-code values: leave screens on platform defaults until the tokens land.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Run these from `apps/mobile/`. Run `npm install` from the repo root.

```bash
npx expo install <package>  # ALWAYS use instead of npm install <package> — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm run lint` and `npm run typecheck` from the repo root before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Use the same paths as the web app (`/credit-cards/<id>` and so on). Deep links and notifications rely on them (Article 8). The URL scheme is `myfinancespace`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `npx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- `ios/` and `android/` are generated (Continuous Native Generation) by `npx expo prebuild` and are not committed. Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
