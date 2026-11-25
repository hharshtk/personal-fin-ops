"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatMoney, formatTick } from "@myfinancespace/core/format";
import { usePrefs } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";
import { niceTicks } from "./scale";

export interface TrendPoint {
  label: string; // axis label (e.g. "Nov")
  title: string; // tooltip title (e.g. "Nov 2026")
  value: number;
  marker?: string; // annotation shown on the axis (an onset)
}

/**
 * Single-series trend line: 2px line, 10% area wash, crosshair + tooltip on
 * hover and on keyboard focus (arrow keys). Labels are HTML so the SVG can
 * stretch to any width without distorting text.
 */
export function TrendChart({
  points,
  height = 120,
  color = "var(--ink)",
  label,
  baselineZero = false,
  showAxis = true,
  xEvery = 3,
  className,
  format,
}: {
  points: TrendPoint[];
  height?: number;
  color?: string;
  label: string;
  baselineZero?: boolean;
  showAxis?: boolean;
  xEvery?: number;
  className?: string;
  format?: (v: number) => string;
}) {
  const { prefs } = usePrefs();
  const fmt = format ?? ((v: number) => formatMoney(v, { compact: true, system: prefs.numberSystem }));
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const values = points.map((p) => p.value);
  const lo = baselineZero ? 0 : Math.min(...values);
  const hi = Math.max(...values);
  const ticks = niceTicks(lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.04, 3);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const n = points.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - ((v - yMin) / (yMax - yMin)) * 100;
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `M0,100 L${points.map((p, i) => `${x(i)},${y(p.value)}`).join(" L")} L100,100 Z`;
  const active = hover ?? n - 1;
  const axisW = showAxis ? 44 : 0;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n - 1) - 1));
    else if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? n - 1) + 1));
    else return;
    e.preventDefault();
  };
  const tipLeft = Math.min(Math.max(x(active), 12), 88);

  return (
    <div className={cx("relative select-none", className)} style={{ paddingLeft: axisW }}>
      {showAxis &&
        ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute right-0 left-0 flex items-center" style={{ top: `${(y(t) / 100) * height}px` }}>
            <span className="num w-[40px] -translate-y-1/2 pr-1.5 text-right text-[11px] text-ink-3">{formatTick(t, prefs.numberSystem)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-rule" />
          </div>
        ))}
      <div
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-pen focus-visible:ring-offset-2"
        style={{ height }}
        role="img"
        tabIndex={0}
        aria-label={`${label}. ${points[0].title}: ${fmt(points[0].value)}; ${points[n - 1].title}: ${fmt(points[n - 1].value)}. Use arrow keys to read each month.`}
        aria-describedby={`${id}-live`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d={area} fill={color} opacity={0.08} />
          <polyline points={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {/* crosshair */}
        <div className="pointer-events-none absolute inset-y-0 w-px bg-rule-2" style={{ left: `${x(active)}%`, opacity: hover === null ? 0 : 1 }} />
        {/* end / active marker with surface ring */}
        <div
          className="pointer-events-none absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-paper"
          style={{ left: `${x(active)}%`, top: `${y(points[active].value)}%`, background: color }}
        />
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-[3px] border border-rule-2 bg-paper px-2.5 py-1.5 whitespace-nowrap shadow-[var(--shadow-pop)]"
            style={{ left: `${tipLeft}%` }}
          >
            <div className="num text-sm font-semibold text-ink">{formatMoney(points[active].value, { system: prefs.numberSystem })}</div>
            <div className="text-xs text-ink-3">{points[active].title}</div>
          </div>
        )}
        <span id={`${id}-live`} className="sr-only" aria-live="polite">
          {hover !== null ? `${points[active].title}: ${fmt(points[active].value)}` : ""}
        </span>
      </div>
      <div className="relative mt-1.5 h-4">
        {points.map((p, i) =>
          i % xEvery === (n - 1) % xEvery || p.marker ? (
            <span
              key={i}
              className={cx("absolute -translate-x-1/2 text-[11px] whitespace-nowrap", p.marker ? "font-semibold text-ink-2" : "text-ink-3")}
              style={{ left: `${x(i)}%` }}
            >
              {p.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
