import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// CONSTITUTION.md, Article 1: the domain core is platform-free.
// tsconfig.json already rejects browser and Node globals. These rules catch
// what the type checker can't: imports of UI frameworks or platform modules,
// and reading the clock.
const ARTICLE_1 = "The core is platform-free (CONSTITUTION.md, Article 1).";

export default defineConfig([
  tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
                "react-native",
                "react-native/*",
                "react-native-*",
                "next",
                "next/*",
                "expo",
                "expo-*",
                "@expo/*",
                "@/*",
                "@myfinancespace/web",
                "@myfinancespace/web/*",
                "@myfinancespace/mobile",
                "@myfinancespace/mobile/*",
                "node:*",
                "fs",
                "path",
              ],
              message: `${ARTICLE_1} Platform code belongs in apps/, or behind an injected interface (Article 11).`,
            },
          ],
        },
      ],
      // Hermes implements only Intl.Collator, DateTimeFormat, NumberFormat and
      // getCanonicalLocales. Before using one of these, confirm that the Hermes
      // version in apps/mobile supports it, then remove it from this list.
      "no-restricted-properties": [
        "error",
        ...[
          "supportedValuesOf",
          "DisplayNames",
          "DurationFormat",
          "ListFormat",
          "Locale",
          "PluralRules",
          "RelativeTimeFormat",
          "Segmenter",
        ].map((property) => ({
          object: "Intl",
          property,
          message: `${ARTICLE_1} Hermes, the engine the phone apps run on, does not implement Intl.${property}.`,
        })),
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: `${ARTICLE_1} "Today" is a parameter: take the date as an argument instead of reading the clock.`,
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: `${ARTICLE_1} "Today" is a parameter: take the date as an argument instead of reading the clock.`,
        },
      ],
    },
  },
]);
