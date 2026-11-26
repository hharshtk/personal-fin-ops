// Builds generated/tokens.css (web) and generated/tokens.ts (iOS and Android)
// from tokens.json. `--check` fails if either file is out of date, so a token
// can't change on one platform only.
import { readFileSync, writeFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const { color, type, radius, space, touchTarget } = JSON.parse(read("./tokens.json"));

for (const [name, value] of Object.entries(color)) {
  for (const scheme of ["light", "dark"]) {
    if (!/^#[0-9a-f]{6}$/.test(value[scheme])) throw new Error(`color.${name}.${scheme} must be a lowercase #rrggbb value`);
  }
}

const BANNER = "Generated from tokens.json by generate.mjs. Do not edit: run `npm run tokens`.";
const rem = (px) => `${px / 16}rem`;
const camel = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const colors = Object.entries(color);

const css = `/* ${BANNER} */

:root {
${colors.map(([name, v]) => `  --${name}: ${v.light};`).join("\n")}
}

[data-theme="dark"] {
${colors.filter(([, v]) => v.dark !== v.light).map(([name, v]) => `  --${name}: ${v.dark};`).join("\n")}
}

@theme inline {
${Object.entries(type).map(([name, t]) => `  --text-${name}: ${rem(t.size)};\n  --text-${name}--line-height: ${rem(t.lineHeight)};`).join("\n")}

${Object.entries(radius).map(([name, px]) => `  --radius-${name}: ${px}px;`).join("\n")}
}
`;

const palette = (scheme) => colors.map(([name, v]) => `    ${camel(name)}: "${v[scheme]}",`).join("\n");
const entries = (group) => Object.entries(group).map(([k, v]) => `${JSON.stringify(k)}: ${v}`).join(", ");

const ts = `// ${BANNER}

export const color = {
  light: {
${palette("light")}
  },
  dark: {
${palette("dark")}
  },
} as const;

export type ColorScheme = keyof typeof color;
export type ColorToken = keyof typeof color.light;
export type Palette = Readonly<Record<ColorToken, string>>;

/** Font size and line height. */
export const type = {
${Object.entries(type).map(([name, t]) => `  ${JSON.stringify(name)}: { ${entries(t)} },`).join("\n")}
} as const;

export const radius = { ${entries(radius)} } as const;

export const space = { ${entries(space)} } as const;

/** Smallest tappable size (CONSTITUTION.md, Article 9). */
export const touchTarget = { ${entries(touchTarget)} } as const;
`;

const check = process.argv.includes("--check");
for (const [path, content] of [["./generated/tokens.css", css], ["./generated/tokens.ts", ts]]) {
  if (!check) {
    writeFileSync(new URL(path, import.meta.url), content);
    continue;
  }
  let current = "";
  try {
    current = read(path);
  } catch {
    // A missing file counts as out of date.
  }
  if (current !== content) {
    console.error(`packages/tokens/${path.slice(2)} is out of date. Run \`npm run tokens\` from the repo root.`);
    process.exit(1);
  }
}
