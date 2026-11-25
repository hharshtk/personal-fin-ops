"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatMoney, formatPct } from "@myfinancespace/core/format";
import { usePrefs } from "@/components/workspace/state";
import { cx } from "./cx";

type Tone = "none" | "flow" | "gain";

/**
 * A rupee amount. `tone="flow"`: money in reads green, money out stays ink.
 * `tone="gain"`: gains green, losses calendar-red. Sign is always printed for
 * negatives so meaning never depends on colour alone.
 */
export function Money({
  value,
  compact = false,
  sign = "auto",
  tone = "none",
  decimals,
  className,
  symbol = true,
}: {
  value: number;
  compact?: boolean | "pref";
  sign?: "auto" | "always" | "never";
  tone?: Tone;
  decimals?: 0 | 2;
  className?: string;
  symbol?: boolean;
}) {
  const { prefs } = usePrefs();
  const isCompact = compact === "pref" ? prefs.compactFigures : compact;
  const text = formatMoney(value, {
    system: prefs.numberSystem,
    compact: isCompact,
    sign,
    decimals: decimals ?? (prefs.showPaise && !isCompact ? 2 : 0),
    symbol,
  });
  const color =
    tone === "flow"
      ? value > 0
        ? "text-green"
        : undefined
      : tone === "gain"
        ? value > 0
          ? "text-green"
          : value < 0
            ? "text-red"
            : undefined
        : undefined;
  return (
    <span className={cx("whitespace-nowrap", color, className)} title={isCompact ? formatMoney(value, { system: prefs.numberSystem, sign }) : undefined}>
      {text}
    </span>
  );
}

export function Delta({
  value,
  pct,
  compact = "pref",
  className,
  invert = false,
}: {
  value: number;
  pct?: number;
  compact?: boolean | "pref";
  className?: string;
  /** For liabilities: a decrease is good */
  invert?: boolean;
}) {
  const good = invert ? value < 0 : value > 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cx("inline-flex items-center gap-0.5 whitespace-nowrap font-medium", value === 0 ? "text-ink-3" : good ? "text-green" : "text-red", className)}>
      <Icon size={14} strokeWidth={2.2} aria-hidden />
      <Money value={value} compact={compact} sign="always" />
      {pct !== undefined && <span className="ml-1">({formatPct(pct, { sign: true })})</span>}
    </span>
  );
}

export function Pct({ value, sign = false, decimals = 1, tone = "none", className }: { value: number; sign?: boolean; decimals?: number; tone?: Tone; className?: string }) {
  const color = tone === "gain" ? (value > 0 ? "text-green" : value < 0 ? "text-red" : undefined) : undefined;
  return <span className={cx("whitespace-nowrap", color, className)}>{formatPct(value, { sign, decimals })}</span>;
}
