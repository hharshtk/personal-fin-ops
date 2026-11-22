"use client";

import { useState } from "react";
import { formatMoney, formatPct } from "@/lib/format";
import { usePrefs } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}

/**
 * One whole split into parts. Tall (28px) prints shares inside blocks that fit;
 * thin (8px) carries no text. 2px surface gap between parts. Hover and focus
 * name every part.
 */
export function SegmentBar({
  segments,
  variant = "thin",
  label,
  className,
  showLegend = true,
}: {
  segments: Segment[];
  variant?: "thin" | "tall";
  label: string;
  className?: string;
  showLegend?: boolean;
}) {
  const { prefs } = usePrefs();
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const [hover, setHover] = useState<string | null>(null);
  const tall = variant === "tall";

  return (
    <div className={cx("min-w-0", className)}>
      <div className={cx("relative flex w-full gap-[2px]", tall ? "h-7" : "h-2")} role="group" aria-label={label}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const share = s.value / total;
            const Comp = s.onClick ? "button" : "div";
            return (
              <Comp
                key={s.key}
                type={s.onClick ? "button" : undefined}
                onClick={s.onClick}
                onPointerEnter={() => setHover(s.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(s.key)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${s.label}: ${formatMoney(s.value, { system: prefs.numberSystem })}, ${formatPct(share * 100)}`}
                className={cx(
                  "relative flex min-w-[3px] items-center overflow-hidden transition-[filter] outline-none first:rounded-l-[4px] last:rounded-r-[4px] focus-visible:ring-2 focus-visible:ring-pen focus-visible:ring-offset-1",
                  !tall && "first:rounded-l-full last:rounded-r-full",
                  hover && hover !== s.key && "opacity-55",
                )}
                style={{ flexGrow: s.value, flexBasis: 0, background: s.color }}
              >
                {tall && share >= 0.075 && (
                  <span className="num pointer-events-none truncate pl-2 text-xs font-semibold" style={{ color: /var\(--c\d\)/.test(s.color) ? s.color.replace("--c", "--on-c") : "#fff" }}>
                    {Math.round(share * 100)}%
                  </span>
                )}
              </Comp>
            );
          })}
        {hover && (
          <div className="pointer-events-none absolute top-full left-0 z-10 mt-1.5 rounded-[3px] border border-rule-2 bg-paper px-2.5 py-1.5 text-xs shadow-[var(--shadow-pop)]">
            {(() => {
              const s = segments.find((x) => x.key === hover)!;
              return (
                <>
                  <span className="font-semibold text-ink">{s.label}</span>{" "}
                  <span className="num text-ink-2">
                    {formatMoney(s.value, { system: prefs.numberSystem })} · {formatPct((s.value / total) * 100)}
                  </span>
                </>
              );
            })()}
          </div>
        )}
      </div>
      {showLegend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {segments.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
