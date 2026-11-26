// Generated from tokens.json by generate.mjs. Do not edit: run `npm run tokens`.

export const color = {
  light: {
    paper: "#ffffff",
    paper2: "#f6f7f9",
    paper3: "#eceef2",
    ground: "#f1f2f5",
    ink: "#191b22",
    ink2: "#4b5060",
    ink3: "#676c7c",
    rule: "#e4e6eb",
    rule2: "#cdd1d9",
    pen: "#2b3aa8",
    pen2: "#3d4cc0",
    penWash: "#eef0fc",
    penWash2: "#e0e4fa",
    red: "#c2202e",
    redWash: "#fdeeef",
    green: "#17784a",
    greenWash: "#e9f5ee",
    amber: "#965500",
    amberWash: "#fdf2df",
    rail: "#f6f7f9",
    railInk: "#2b2f3a",
    railInk2: "#646a7a",
    railHover: "#eceef2",
    railRule: "#e4e6eb",
    c1: "#00927e",
    c2: "#d97a1e",
    c3: "#1f86c7",
    c4: "#b98b00",
    c5: "#9a4fb5",
    c6: "#4e8a2e",
    cNeutral: "#9aa0ad",
    cTrack: "#eceef2",
    onC1: "#0b0c10",
    onC2: "#0b0c10",
    onC3: "#0b0c10",
    onC4: "#0b0c10",
    onC5: "#ffffff",
    onC6: "#0b0c10",
  },
  dark: {
    paper: "#15171e",
    paper2: "#1b1e27",
    paper3: "#252935",
    ground: "#101218",
    ink: "#e8eaf0",
    ink2: "#b0b5c3",
    ink3: "#8d93a4",
    rule: "#2a2e3a",
    rule2: "#3b4050",
    pen: "#a3adff",
    pen2: "#8f9bff",
    penWash: "#232a52",
    penWash2: "#2d3566",
    red: "#ff7b80",
    redWash: "#3a1d23",
    green: "#55c78e",
    greenWash: "#15302a",
    amber: "#f1b24c",
    amberWash: "#33270f",
    rail: "#101218",
    railInk: "#d6d9e2",
    railInk2: "#8b91a1",
    railHover: "#1b1e27",
    railRule: "#23262f",
    c1: "#12a08b",
    c2: "#d57a2c",
    c3: "#2f93d0",
    c4: "#b08812",
    c5: "#ac6bc8",
    c6: "#5e9e3c",
    cNeutral: "#6b7183",
    cTrack: "#262a36",
    onC1: "#0b0c10",
    onC2: "#0b0c10",
    onC3: "#0b0c10",
    onC4: "#0b0c10",
    onC5: "#0b0c10",
    onC6: "#0b0c10",
  },
} as const;

export type ColorScheme = keyof typeof color;
export type ColorToken = keyof typeof color.light;
export type Palette = Readonly<Record<ColorToken, string>>;

/** Font size and line height. */
export const type = {
  "2xs": { "size": 11, "lineHeight": 14 },
  "xs": { "size": 12, "lineHeight": 16 },
  "sm": { "size": 13, "lineHeight": 18 },
  "base": { "size": 14, "lineHeight": 20 },
  "lg": { "size": 16, "lineHeight": 22 },
  "xl": { "size": 20, "lineHeight": 26 },
  "2xl": { "size": 24, "lineHeight": 30 },
  "3xl": { "size": 32, "lineHeight": 36 },
} as const;

export const radius = { "xs": 2, "sm": 3, "md": 5, "lg": 8 } as const;

export const space = { "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24, "8": 32 } as const;

/** Smallest tappable size (CONSTITUTION.md, Article 9). */
export const touchTarget = { "ios": 44, "android": 48 } as const;
