"use client";

import { Check, Repeat2 } from "lucide-react";
import type { ISODate, MonthKey, Occurrence, Transaction } from "@myfinancespace/core/types";
import { AS_OF, getCommitment } from "@myfinancespace/core/data";
import { daysInMonth, formatMoney, parts, weekday } from "@myfinancespace/core/format";
import { effectiveStatus } from "@myfinancespace/core/payments";
import { usePrefs } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";

/** Bank holidays that matter for payment timing (Karnataka + national), fixed dates only. */
export const HOLIDAYS: Record<ISODate, string> = {
  "2026-10-02": "Gandhi Jayanti",
  "2026-11-01": "Rajyotsava",
  "2026-11-08": "Deepavali",
  "2026-12-25": "Christmas",
  "2027-01-26": "Republic Day",
};

export interface DayEntry {
  occ: Occurrence;
  status: Occurrence["status"];
  paidOn?: ISODate;
}

export function shortName(name: string) {
  return name
    .replace(/^SIP · /, "SIP ")
    .replace(" Opportunities", "")
    .replace(" Flexi Cap", "")
    .replace(" Index", "")
    .replace(" installment", "")
    .replace("Recurring deposit", "RD")
    .replace(" contribution", "")
    .replace(" renewal", "")
    .replace(" Gold bill", " bill")
    .replace(" Pay bill", " bill");
}

export function MonthSheet({
  month,
  occurrences,
  incomes = [],
  paid,
  selected,
  onSelect,
  onOpen,
  density = "compact",
  weekStart = 1,
}: {
  month: MonthKey;
  occurrences: Occurrence[];
  incomes?: Transaction[];
  paid: Set<string>;
  selected?: ISODate | null;
  onSelect: (d: ISODate) => void;
  onOpen: (o: Occurrence) => void;
  density?: "compact" | "full";
  weekStart?: 0 | 1;
}) {
  const { prefs } = usePrefs();
  const { y, m } = parts(`${month}-01`);
  const dim = daysInMonth(y, m);
  const lead = (weekday(`${month}-01`) - weekStart + 7) % 7;
  const cells: (ISODate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  const names = weekStart === 1 ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const max = density === "full" ? 4 : 2;
  const fmt = (v: number) => formatMoney(v, { compact: true, system: prefs.numberSystem, symbol: false });

  const byDay = new Map<ISODate, DayEntry[]>();
  for (const o of occurrences) {
    if (!o.date.startsWith(month)) continue;
    const e = effectiveStatus(o, paid);
    const list = byDay.get(o.date) ?? [];
    list.push({ occ: o, ...e });
    byDay.set(o.date, list);
  }
  const incomeByDay = new Map<ISODate, number>();
  for (const t of incomes) {
    if (!t.date.startsWith(month)) continue;
    incomeByDay.set(t.date, (incomeByDay.get(t.date) ?? 0) + t.amount);
  }

  return (
    <div role="grid" aria-label={`Money calendar, ${month}`} className="w-full">
      <div role="row" className="grid grid-cols-7 border-b border-rule-2">
        {names.map((n) => (
          <div key={n} role="columnheader" className="px-2 pb-1.5 text-xs font-medium text-ink-3">
            {n}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} className={cx("border-b border-rule bg-paper-2/60", i % 7 !== 6 && "border-r", density === "full" ? "min-h-[104px]" : "min-h-[76px]")} aria-hidden />;
          const entries = (byDay.get(date) ?? []).sort((a, b) => rank(a.status) - rank(b.status) || b.occ.amount - a.occ.amount);
          const owes = entries.some((e) => e.status === "due" || e.status === "overdue");
          const overdue = entries.some((e) => e.status === "overdue");
          const isToday = date === AS_OF;
          const isSel = selected === date;
          const income = incomeByDay.get(date);
          const holiday = HOLIDAYS[date];
          const d = parts(date).d;
          const label = `${d} ${month}${entries.length ? `, ${entries.length} payments` : ""}${owes ? ", money due" : ""}${isToday ? ", today" : ""}`;
          return (
            <div
              key={date}
              role="gridcell"
              aria-selected={isSel}
              className={cx(
                "group relative flex flex-col border-b border-rule text-left",
                i % 7 !== 6 && "border-r",
                density === "full" ? "min-h-[104px] p-2" : "min-h-[76px] p-1.5",
                overdue && "bg-red-wash",
                isSel && "bg-pen-wash ring-2 ring-pen ring-inset",
                date > AS_OF && !isSel && !overdue && "bg-paper",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(date)}
                className="absolute inset-0 z-0 hover:bg-ink/[0.025]"
                aria-label={label}
                aria-pressed={isSel}
              />
              <div className="pointer-events-none relative z-[1] flex items-start justify-between gap-1">
                <span
                  className={cx(
                    "daynum grid place-items-center",
                    density === "full" ? "h-8 min-w-8 text-[26px]" : "h-7 min-w-7 text-[22px]",
                    owes ? "text-red" : date < AS_OF ? "text-ink-2" : "text-ink",
                    isToday && "pen-ring px-1",
                  )}
                >
                  {d}
                </span>
                {income ? <span className="num mt-1 text-[11px] font-semibold text-green">+{fmt(income)}</span> : null}
              </div>
              <ul className="relative z-[1] mt-1 space-y-px">
                {entries.slice(0, max).map(({ occ, status }) => {
                  const c = getCommitment(occ.commitmentId)!;
                  return (
                    <li key={occ.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(occ)}
                        className={cx(
                          "flex w-full items-center gap-1 rounded-[2px] px-0.5 text-left text-[11px] leading-[15px] hover:bg-paper-3",
                          status === "paid" ? "text-ink-3" : status === "due" || status === "overdue" ? "font-semibold text-red" : "text-ink-2",
                        )}
                        title={`${c.name} · ${formatMoney(occ.amount)} · ${status}`}
                      >
                        {status === "paid" ? (
                          <Check size={10} strokeWidth={3} className="shrink-0 text-pen" aria-label="paid" />
                        ) : status === "scheduled" ? (
                          <Repeat2 size={10} className="shrink-0 text-ink-3" aria-label="autopay" />
                        ) : null}
                        <span className={cx("min-w-0 flex-1 truncate", status === "paid" && "line-through decoration-ink-3/60")}>{shortName(c.name)}</span>
                        <span className={cx("num shrink-0", status === "paid" && "line-through decoration-ink-3/60")}>{fmt(occ.amount)}</span>
                      </button>
                    </li>
                  );
                })}
                {entries.length > max && (
                  <li className="pointer-events-none px-0.5 text-[11px] text-ink-3">+{entries.length - max} more</li>
                )}
              </ul>
              {holiday && <span className="pointer-events-none relative z-[1] mt-auto truncate pt-0.5 text-[11px] text-ink-3 italic">{holiday} · bank holiday</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function rank(s: Occurrence["status"]) {
  return s === "overdue" ? 0 : s === "due" ? 1 : s === "scheduled" ? 2 : 3;
}
