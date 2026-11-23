import type { ISODate, MonthKey } from "./types";

/* ───────────────────────── Numbers ───────────────────────── */

export type NumberSystem = "indian" | "international";

export interface MoneyFormat {
  system?: NumberSystem;
  /** Compact: ₹1.84 Cr / ₹62.5 L in Indian, ₹18.4M in international */
  compact?: boolean;
  /** Show paise / cents */
  decimals?: 0 | 2;
  /** "always" prints + for positives */
  sign?: "auto" | "always" | "never";
  symbol?: boolean;
}

const MINUS = "−";

function groupIndian(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

function groupInternational(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatNumber(
  value: number,
  { system = "indian", decimals = 0 }: { system?: NumberSystem; decimals?: number } = {},
): string {
  const abs = Math.abs(value);
  const fixed = abs.toFixed(decimals);
  const [i, f] = fixed.split(".");
  const grouped = system === "indian" ? groupIndian(i) : groupInternational(i);
  return f ? `${grouped}.${f}` : grouped;
}

function trimZeros(s: string) {
  return s.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

/** Compact magnitude: returns [number, unit] */
export function compactParts(abs: number, system: NumberSystem): [string, string] {
  if (system === "indian") {
    if (abs >= 1e7) return [(abs / 1e7).toFixed(2), "Cr"];
    if (abs >= 1e5) return [(abs / 1e5).toFixed(abs >= 1e6 ? 1 : 2), "L"];
    if (abs >= 1e3) return [trimZeros((abs / 1e3).toFixed(1)), "K"];
    return [String(Math.round(abs)), ""];
  }
  if (abs >= 1e9) return [trimZeros((abs / 1e9).toFixed(2)), "B"];
  if (abs >= 1e6) return [trimZeros((abs / 1e6).toFixed(2)), "M"];
  if (abs >= 1e3) return [trimZeros((abs / 1e3).toFixed(1)), "K"];
  return [String(Math.round(abs)), ""];
}

/** Axis tick: compact and trimmed (₹2 Cr, ₹1.8 Cr, ₹6 L) */
export function formatTick(value: number, system: NumberSystem = "indian"): string {
  if (value === 0) return "0";
  const [n, unit] = compactParts(Math.abs(value), system);
  return `${value < 0 ? MINUS : ""}${trimZeros(n)}${unit ? ` ${unit}` : ""}`;
}

export function formatMoney(value: number, opts: MoneyFormat = {}): string {
  const { system = "indian", compact = false, decimals = 0, sign = "auto", symbol = true } = opts;
  const abs = Math.abs(value);
  const rounded = decimals === 0 ? Math.round(abs) : abs;
  let body: string;
  if (compact) {
    const [n, unit] = compactParts(rounded, system);
    body = unit ? `${n} ${unit}` : n;
  } else {
    body = formatNumber(rounded, { system, decimals });
  }
  const sym = symbol ? "₹" : "";
  const isNeg = value < 0 && rounded !== 0;
  const prefix =
    sign === "never" ? "" : isNeg ? MINUS : sign === "always" && rounded !== 0 ? "+" : "";
  return `${prefix}${sym}${body}`;
}

export function formatPct(value: number, { decimals = 1, sign = false } = {}): string {
  const s = Math.abs(value).toFixed(decimals);
  const p = value < 0 ? MINUS : sign && value > 0 ? "+" : "";
  return `${p}${s}%`;
}

/* ───────────────────────── Dates ─────────────────────────
 * Dates are plain ISO strings. All math is done in UTC on date-only values
 * so server and browser render identical output (no locale/timezone drift).
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Sunday, 22 November 2026" */
export function formatLongDate(iso: ISODate): string {
  const { y, m, d } = parts(iso);
  return `${WEEKDAYS_LONG[weekday(iso)]}, ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

export function toUTC(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function fromUTC(ms: number): ISODate {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromUTC(toUTC(iso) + days * 86400000);
}

export function addMonths(iso: ISODate, months: number, day?: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const dim = daysInMonth(ny, nm);
  const nd = Math.min(day ?? d, dim);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / 86400000);
}

export function weekday(iso: ISODate): number {
  return new Date(toUTC(iso)).getUTCDay();
}

export function monthOf(iso: ISODate): MonthKey {
  return iso.slice(0, 7);
}

export function parts(iso: ISODate) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** "22 Nov", "22 Nov 2026", "Nov 2026", "November", "Sun, 22 Nov" */
export function formatDate(
  iso: ISODate,
  style: "d MMM" | "d MMM yyyy" | "MMM yyyy" | "MMMM yyyy" | "EEE, d MMM" | "MMM" | "MMMM" | "MMM yy" = "d MMM yyyy",
): string {
  const { y, m, d } = parts(iso);
  const mon = MONTHS[m - 1];
  switch (style) {
    case "d MMM":
      return `${String(d).padStart(2, "0")} ${mon}`;
    case "d MMM yyyy":
      return `${String(d).padStart(2, "0")} ${mon} ${y}`;
    case "MMM yyyy":
      return `${mon} ${y}`;
    case "MMMM yyyy":
      return `${MONTHS_LONG[m - 1]} ${y}`;
    case "MMM":
      return mon;
    case "MMMM":
      return MONTHS_LONG[m - 1];
    case "MMM yy":
      return `${mon} ’${String(y).slice(2)}`;
    case "EEE, d MMM":
      return `${WEEKDAYS[weekday(iso)]}, ${String(d).padStart(2, "0")} ${mon}`;
  }
}

export function formatMonth(key: MonthKey, style: "MMM" | "MMMM" | "MMM yy" | "MMMM yyyy" | "MMM yyyy" = "MMM yyyy") {
  return formatDate(`${key}-01`, style);
}

/** "June to November 2026", or "December 2025 to May 2026" across a year end. */
export function monthSpanLabel(from: MonthKey, to: MonthKey): string {
  return `${formatMonth(from, from.slice(0, 4) === to.slice(0, 4) ? "MMMM" : "MMMM yyyy")} to ${formatMonth(to, "MMMM yyyy")}`;
}

/** Indian financial year label: FY 2026–27 for any date between Apr 2026 and Mar 2027 */
export function fyLabel(iso: ISODate, startMonth = 4): string {
  const { y, m } = parts(iso);
  const start = m >= startMonth ? y : y - 1;
  if (startMonth === 1) return `FY ${start}`;
  return `FY ${start}–${String(start + 1).slice(2)}`;
}

export function relativeDays(iso: ISODate, asOf: ISODate): string {
  const n = diffDays(iso, asOf);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 0) return n < 60 ? `in ${n} days` : `in ${Math.round(n / 30)} months`;
  return -n < 60 ? `${-n} days ago` : `${Math.round(-n / 30)} months ago`;
}

export function monthsBetween(from: ISODate, to: ISODate): number {
  const a = parts(from);
  const b = parts(to);
  return (b.y - a.y) * 12 + (b.m - a.m);
}

export function durationLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y && m) return `${y} yr ${m} mo`;
  if (y) return `${y} yr`;
  return `${m} mo`;
}
