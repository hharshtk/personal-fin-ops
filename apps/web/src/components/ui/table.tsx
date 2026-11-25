"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cx } from "./cx";

export type SortDir = "asc" | "desc";

export function useSort<T, K extends string>(rows: T[], accessors: Record<K, (r: T) => string | number>, initial: { key: NoInfer<K>; dir: SortDir }) {
  const [sort, setSort] = useState(initial);
  const get = accessors[sort.key];
  const sorted = [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sort.dir === "asc" ? c : -c;
  });
  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: rows.length && typeof accessors[key](rows[0]) === "number" ? "desc" : "asc" }));
  return { sorted, sort, toggle };
}

export function SortTh<K extends string>({
  k,
  sort,
  onSort,
  children,
  align = "left",
  className,
}: {
  k: K;
  sort: { key: K; dir: SortDir };
  onSort: (k: K) => void;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cx(align === "right" && "r", className)} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={cx("sort-btn", align === "right" && "flex-row-reverse", active && "text-ink")} onClick={() => onSort(k)}>
        {children}
        <Icon size={12} className={cx(!active && "opacity-40")} aria-hidden />
      </button>
    </th>
  );
}

/** Horizontal scroll container for wide tables on narrow screens */
export function TableWrap({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div className={cx("w-full overflow-x-auto", className)} role={label ? "region" : undefined} aria-label={label} tabIndex={label ? 0 : undefined}>{children}</div>;
}
