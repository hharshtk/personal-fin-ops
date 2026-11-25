"use client";

import Link from "next/link";
import { AlertTriangle, Check, CircleAlert, Info, Repeat2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { EntityRef, ISODate, OccurrenceStatus } from "@myfinancespace/core/types";
import { formatDate, parts, MONTHS } from "@myfinancespace/core/format";
import { useUI } from "@/components/workspace/state";
import { cx } from "./cx";

/* ───────────── Page scaffolding ───────────── */

export function PageHeader({
  title,
  meta,
  actions,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 pt-4 md:px-6 md:pt-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-xl font-[650] tracking-[-0.01em] text-ink">{title}</h1>
          {meta && <div className="mt-0.5 text-sm text-ink-3">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** A region of a workspace: divided from its neighbours by a rule, titled by type. */
export function Section({
  title,
  meta,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section className={cx("min-w-0", className)} aria-labelledby={id ? `${id}-title` : undefined}>
      {(title || actions) && (
        <div className="flex min-h-9 items-center justify-between gap-3 px-4 pt-3 pb-2 md:px-5">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="section-title truncate">
                {title}
              </h2>
            )}
            {meta && <span className="truncate text-xs text-ink-3">{meta}</span>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  sub,
  onClick,
  href,
  className,
  size = "md",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  size?: "md" | "lg";
}) {
  const body = (
    <>
      <div className="label">{label}</div>
      <div className={cx("figure mt-1 text-ink", size === "lg" ? "text-3xl" : "text-2xl")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-3">{sub}</div>}
    </>
  );
  const cls = cx("block min-w-0 px-4 py-3 text-left md:px-5", (onClick || href) && "transition-colors hover:bg-paper-2", className);
  if (href)
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid grid-cols-2 gap-px border-y border-rule bg-rule md:auto-cols-fr md:grid-flow-col md:grid-cols-none [&>*]:bg-paper", className)}>
      {children}
    </div>
  );
}

/* ───────────── Dates: the calendar numeral ───────────── */

export function DateMark({
  date,
  tone = "default",
  showMonth = true,
  className,
}: {
  date: ISODate;
  tone?: "default" | "due" | "muted";
  showMonth?: boolean;
  className?: string;
}) {
  const { d, m } = parts(date);
  return (
    <span className={cx("inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <span className={cx("daynum text-[15px]", tone === "due" ? "text-red" : tone === "muted" ? "text-ink-3" : "text-ink")}>{String(d).padStart(2, "0")}</span>
      {showMonth && <span className="text-xs text-ink-3">{MONTHS[m - 1]}</span>}
    </span>
  );
}

/* ───────────── Status ───────────── */

export function OccurrenceTag({ status, paidOn, autopay }: { status: OccurrenceStatus; paidOn?: ISODate; autopay?: boolean }) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-pen">
        <Check size={13} strokeWidth={2.6} aria-hidden />
        Paid{paidOn ? ` ${formatDate(paidOn, "d MMM")}` : ""}
      </span>
    );
  if (status === "overdue")
    return (
      <span className="inline-flex items-center gap-1 rounded-xs bg-red-wash px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-red">
        <CircleAlert size={12} strokeWidth={2.4} aria-hidden />
        Overdue
      </span>
    );
  if (status === "due")
    return (
      <span className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-red ring-1 ring-red/40 ring-inset">
        Due
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-ink-2">
      <Repeat2 size={13} strokeWidth={2} aria-hidden />
      {autopay === false ? "Scheduled" : "Autopay"}
    </span>
  );
}

const SEVERITY: Record<string, { icon: LucideIcon; cls: string; label: string }> = {
  critical: { icon: CircleAlert, cls: "text-red", label: "Critical" },
  warning: { icon: AlertTriangle, cls: "text-amber", label: "Warning" },
  info: { icon: Info, cls: "text-ink-3", label: "For your information" },
};

export function SeverityIcon({ severity, size = 15 }: { severity: "critical" | "warning" | "info"; size?: number }) {
  const s = SEVERITY[severity];
  const Icon = s.icon;
  return <Icon size={size} strokeWidth={2.2} className={cx("shrink-0", s.cls)} aria-label={s.label} role="img" />;
}

export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "pen" | "red" | "amber" | "green"; className?: string }) {
  const tones = {
    neutral: "bg-paper-3 text-ink-2",
    pen: "bg-pen-wash text-pen",
    red: "bg-red-wash text-red",
    amber: "bg-amber-wash text-amber",
    green: "bg-green-wash text-green",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-xs px-1.5 py-px text-xs font-medium whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

/* ───────────── Meters ───────────── */

/**
 * Planned-vs-actual meter. The bar scales to max(actual, plan) so overspend is
 * visible as the part past the plan marker; fill colour carries severity.
 */
export function BudgetMeter({ ratio, alertAt = 0.9, className, height = 6 }: { ratio: number; alertAt?: number; className?: string; height?: number }) {
  const scale = Math.max(1, ratio);
  const fill = Math.min(ratio, scale) / scale;
  const marker = 1 / scale;
  const tone = ratio > 1 ? "bg-red" : ratio >= alertAt ? "bg-amber" : "bg-ink-2";
  return (
    <div className={cx("relative w-full rounded-full bg-[var(--c-track)]", className)} style={{ height }} aria-hidden>
      <div className={cx("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${fill * 100}%` }} />
      {ratio > 1 && <div className="absolute -inset-y-1 w-[2px] bg-paper" style={{ left: `calc(${marker * 100}% - 1px)` }} />}
    </div>
  );
}

export function Progress({ value, className, tone = "ink", height = 6 }: { value: number; className?: string; tone?: "ink" | "pen" | "green" | "amber" | "red"; height?: number }) {
  const tones = { ink: "bg-ink-2", pen: "bg-pen", green: "bg-green", amber: "bg-amber", red: "bg-red" };
  return (
    <div className={cx("relative w-full overflow-hidden rounded-full bg-[var(--c-track)]", className)} style={{ height }} aria-hidden>
      <div className={cx("absolute inset-y-0 left-0 rounded-full", tones[tone])} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/* ───────────── Links into the inspector ───────────── */

export function InspectButton({ target, children, className }: { target: EntityRef; children: ReactNode; className?: string }) {
  const { inspect } = useUI();
  return (
    <button type="button" onClick={() => inspect(target)} className={cx("text-left hover:text-pen hover:underline", className)}>
      {children}
    </button>
  );
}

/* ───────────── Definition list ───────────── */

export function Facts({ items, className, cols = 2 }: { items: [ReactNode, ReactNode][]; className?: string; cols?: 1 | 2 }) {
  return (
    <dl className={cx("grid gap-x-6 gap-y-2.5", cols === 2 ? "grid-cols-2" : "grid-cols-1", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="label">{k}</dt>
          <dd className="mt-0.5 text-sm text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────────── Empty / loading ───────────── */

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icon size={22} strokeWidth={1.8} className="text-ink-3" aria-hidden />
      <p className="mt-3 text-base font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="px-4 md:px-5" role="status" aria-label="Loading">
      <div className="flex h-8 items-center gap-6 border-b border-rule-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-2.5" style={{ width: `${12 + ((i * 7) % 10)}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-9 items-center gap-6 border-b border-rule">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-2.5" style={{ width: `${10 + ((r * 3 + i * 11) % 18)}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string; shape?: "rect" | "line" }[]; className?: string }) {
  return (
    <ul className={cx("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2", className)}>
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={it.shape === "line" ? "h-[2px] w-3 rounded-full" : "size-2.5 rounded-[2px]"} style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
