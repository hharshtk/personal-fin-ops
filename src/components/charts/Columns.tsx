"use client";

import { useState } from "react";
import { formatMoney, formatTick } from "@/lib/format";
import { usePrefs } from "@/components/workspace/state";
import { Legend } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";
import { niceTicks } from "./scale";

export interface Series {
  key: string;
  label: string;
  color: string;
  /** Columns sharing a stack id are drawn on top of each other */
  stack?: string;
}

export interface ColumnDatum {
  label: string;
  title: string;
  values: Record<string, number>;
  highlight?: boolean;
}

/**
 * Grouped / stacked columns in HTML: bars ≤ 24px, 4px rounded data-end,
 * square at the baseline, 2px surface gap between touching marks.
 */
export function Columns({
  data,
  series,
  height = 160,
  label,
  className,
  onSelect,
}: {
  data: ColumnDatum[];
  series: Series[];
  height?: number;
  label: string;
  className?: string;
  onSelect?: (i: number) => void;
}) {
  const { prefs } = usePrefs();
  const fmt = (v: number, compact = true) => formatMoney(v, { compact, system: prefs.numberSystem });
  const [hover, setHover] = useState<number | null>(null);

  const stacks: Series[][] = [];
  for (const s of series) {
    const existing = s.stack ? stacks.find((g) => g[0].stack === s.stack) : undefined;
    if (existing) existing.push(s);
    else stacks.push([s]);
  }
  const max = Math.max(...data.map((d) => Math.max(...stacks.map((g) => g.reduce((sum, s) => sum + Math.max(0, d.values[s.key] ?? 0), 0)))));
  const ticks = niceTicks(0, max, 3);
  const top = ticks[ticks.length - 1];
  const h = (v: number) => (v / top) * height;

  return (
    <div className={cx("min-w-0", className)}>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} className="mb-3" />
      <div className="relative pl-[44px]" role="img" aria-label={label}>
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute right-0 left-0 flex items-center" style={{ bottom: `${h(t) + 20}px` }}>
            <span className="num w-[40px] translate-y-1/2 pr-1.5 text-right text-[11px] text-ink-3">{formatTick(t, prefs.numberSystem)}</span>
            <span className={cx("h-px flex-1 translate-y-1/2", t === 0 ? "bg-rule-2" : "bg-rule")} />
          </div>
        ))}
        <div className="relative flex items-end" style={{ height: height + 20 }}>
          {data.map((d, i) => (
            <div
              key={d.label + i}
              className={cx("group relative flex h-full flex-1 flex-col items-center justify-end", onSelect && "cursor-pointer")}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect?.(i)}
              tabIndex={0}
              aria-label={`${d.title}: ${series.map((s) => `${s.label} ${fmt(d.values[s.key] ?? 0, false)}`).join(", ")}`}
            >
              <div className={cx("absolute inset-x-0.5 top-0 bottom-5 rounded-[3px] transition-colors", hover === i && "bg-paper-2")} />
              <div className="relative flex items-end gap-[2px]" style={{ height }}>
                {stacks.map((g, gi) => (
                  <div key={gi} className="flex w-[clamp(6px,1.6vw,20px)] flex-col-reverse gap-[2px]">
                    {g.map((s, si) => {
                      const v = Math.max(0, d.values[s.key] ?? 0);
                      if (!v) return null;
                      const isTop = si === g.length - 1 || g.slice(si + 1).every((x) => !(d.values[x.key] ?? 0));
                      return <div key={s.key} style={{ height: Math.max(1, h(v) - 2), background: s.color }} className={cx(isTop && "rounded-t-[4px]")} />;
                    })}
                  </div>
                ))}
              </div>
              <span className={cx("relative mt-1 h-4 text-[11px] whitespace-nowrap", d.highlight ? "font-semibold text-ink" : "text-ink-3")}>{d.label}</span>
              {hover === i && (
                <div
                  className={cx(
                    "pointer-events-none absolute bottom-full z-10 mb-1 min-w-[170px] rounded-[3px] border border-rule-2 bg-paper px-3 py-2 shadow-[var(--shadow-pop)]",
                    i < data.length / 3 ? "left-0" : i > (data.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                  )}
                >
                  <div className="mb-1 text-xs font-semibold text-ink-2">{d.title}</div>
                  {series.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-ink-3">
                        <span className="h-[2px] w-3 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="num font-semibold text-ink">{fmt(d.values[s.key] ?? 0, false)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
