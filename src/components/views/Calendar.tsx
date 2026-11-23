"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Repeat2 } from "lucide-react";
import type { CommitmentKind, ISODate, MonthKey } from "@/lib/types";
import { AS_OF, AS_OF_MONTH, CALENDAR_MONTHS, COMMITMENTS, OCCURRENCES, getCategory, getCommitment, ledgerAccountShort, remainingBillAmount } from "@/lib/data";
import { diffDays, formatDate, formatMonth, relativeDays } from "@/lib/format";
import { useLedger, usePrefs, useUI } from "@/components/workspace/state";
import { usePayOccurrence } from "@/components/workspace/actions";
import { effectiveStatus } from "@/lib/payments";
import { Money } from "@/components/ui/money";
import { DateMark, Metric, MetricStrip, OccurrenceTag, PageHeader, Section } from "@/components/ui/primitives";
import { MonthSheet } from "@/components/calendar/MonthSheet";
import { TableWrap } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";

const KINDS: { id: "all" | CommitmentKind | "invest"; label: string; match: (k: CommitmentKind) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "emi", label: "EMIs", match: (k) => k === "emi" },
  { id: "card", label: "Card bills", match: (k) => k === "card" },
  { id: "invest", label: "SIPs & deposits", match: (k) => k === "sip" || k === "deposit" || k === "transfer" },
  { id: "utility", label: "Utilities", match: (k) => k === "utility" },
  { id: "subscription", label: "Subscriptions", match: (k) => k === "subscription" },
  { id: "insurance", label: "Insurance", match: (k) => k === "insurance" },
  { id: "household", label: "Household", match: (k) => k === "household" },
];

export function CalendarView() {
  const { paidOccurrences, txns } = useLedger();
  const { prefs } = usePrefs();
  const { inspect } = useUI();
  const pay = usePayOccurrence();
  const [month, setMonth] = useState<MonthKey>(AS_OF_MONTH);
  const [view, setView] = useState<"month" | "list">("month");
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [day, setDay] = useState<ISODate | null>(null);
  const mi = CALENDAR_MONTHS.indexOf(month);

  const match = KINDS.find((k) => k.id === kind)!.match;
  const occs = OCCURRENCES.filter((o) => match(getCommitment(o.commitmentId)!.kind));
  const withStatus = occs.map((o) => {
    const status = effectiveStatus(o, paidOccurrences);
    return { o, ...status, amount: status.status === "paid" ? o.amount : remainingBillAmount(o, txns) };
  });
  const inMonth = withStatus.filter((x) => x.o.date.startsWith(month));
  const overdue = withStatus.filter((x) => x.status === "overdue");
  const due30 = withStatus.filter((x) => x.status === "due" && diffDays(x.o.date, AS_OF) <= 30);
  const auto30 = withStatus.filter((x) => x.status === "scheduled" && diffDays(x.o.date, AS_OF) <= 30);
  const paidThisMonth = withStatus.filter((x) => x.status === "paid" && x.o.date.startsWith(AS_OF_MONTH));
  const sum = (xs: typeof withStatus) => xs.reduce((s, x) => s + x.amount, 0);
  const side = day ? withStatus.filter((x) => x.o.date === day) : withStatus.filter((x) => x.o.date >= AS_OF && diffDays(x.o.date, AS_OF) <= 14 && x.status !== "paid");

  const Row = ({ x, compact = false }: { x: (typeof withStatus)[number]; compact?: boolean }) => {
    const c = getCommitment(x.o.commitmentId)!;
    const red = x.status === "due" || x.status === "overdue";
    return (
      <div className={cx("flex items-center gap-3 border-b border-rule py-2 last:border-b-0", x.status === "overdue" && "bg-red-wash/60")}>
        <DateMark date={x.o.date} tone={red ? "due" : x.status === "paid" ? "muted" : "default"} className="w-[50px] shrink-0" />
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => inspect({ kind: "commitment", id: x.o.id })}>
          <span className={cx("block truncate text-sm hover:text-pen hover:underline", x.status === "paid" ? "text-ink-3" : "text-ink")}>{c.name}</span>
          <span className="block truncate text-xs text-ink-3">{compact ? relativeDays(x.o.date, AS_OF) + " · " : ""}from {ledgerAccountShort(c.payFromId)}</span>
        </button>
        <Money value={x.amount} className={cx("num text-sm font-semibold", x.status === "paid" && "struck font-normal")} />
        <span className="w-[86px] text-right">
          {red ? (
            <button type="button" className="btn btn-sm h-6 px-2" onClick={() => pay(x.o)}>
              Mark paid
            </button>
          ) : (
            <OccurrenceTag status={x.status} paidOn={x.paidOn} autopay={c.autopay} />
          )}
        </span>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Bills & calendar" meta="Every EMI, card bill, SIP, premium and subscription on one sheet" />
      <MetricStrip className="mt-4">
        <Metric label="Overdue" value={<span className={overdue.length ? "text-red" : undefined}>{overdue.length}</span>} sub={overdue.length ? <Money value={sum(overdue)} /> : "Nothing late"} onClick={overdue[0] ? () => inspect({ kind: "commitment", id: overdue[0].o.id }) : undefined} />
        <Metric label="Needs you, next 30 days" value={due30.length} sub={<><Money value={sum(due30)} /> to pay manually</>} />
        <Metric label="Autopay, next 30 days" value={auto30.length} sub={<><Money value={sum(auto30)} /> will debit itself</>} />
        <Metric label={`Paid in ${formatMonth(AS_OF_MONTH, "MMMM")}`} value={paidThisMonth.length} sub={<><Money value={sum(paidThisMonth)} /> cleared</>} />
      </MetricStrip>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-icon" disabled={mi <= 0} onClick={() => (setMonth(CALENDAR_MONTHS[mi - 1]), setDay(null))} aria-label="Previous month">
            <ChevronLeft size={16} aria-hidden />
          </button>
          <h2 className="figure w-[180px] text-center text-xl">{formatMonth(month, "MMMM yyyy")}</h2>
          <button type="button" className="btn btn-ghost btn-icon" disabled={mi >= CALENDAR_MONTHS.length - 1} onClick={() => (setMonth(CALENDAR_MONTHS[mi + 1]), setDay(null))} aria-label="Next month">
            <ChevronRight size={16} aria-hidden />
          </button>
          <button type="button" className="btn btn-sm ml-2" disabled={month === AS_OF_MONTH} onClick={() => (setMonth(AS_OF_MONTH), setDay(null))}>
            Today
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="seg" role="group" aria-label="Show">
            {KINDS.map((k) => (
              <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>
              Month
            </button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
              List
            </button>
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid gap-px border-y border-rule bg-rule xl:grid-cols-12 [&>*]:bg-paper">
          <div className="overflow-x-auto px-4 py-4 md:px-6 xl:col-span-8">
            <div className="min-w-[600px]">
              <MonthSheet
                month={month}
                occurrences={withStatus.map(({ o, amount }) => ({ ...o, amount }))}
                paid={paidOccurrences}
                selected={day}
                onSelect={(d) => setDay((cur) => (cur === d ? null : d))}
                onOpen={(o) => inspect({ kind: "commitment", id: o.id })}
                density="full"
                weekStart={prefs.weekStart}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
              <span>
                <span className="daynum text-sm text-red">28</span> money due, needs you
              </span>
              <span className="inline-flex items-center gap-1">
                <Repeat2 size={12} aria-hidden /> autopay will debit
              </span>
              <span>
                <span className="line-through">struck</span> paid and cleared
              </span>
              <span>Tinted day: overdue</span>
            </div>
          </div>
          <Section className="xl:col-span-4" title={day ? formatDate(day, "EEE, d MMM") : "Next 14 days"} meta={day ? relativeDays(day, AS_OF) : "still to pay"} actions={day ? <button type="button" className="text-xs font-medium text-pen hover:underline" onClick={() => setDay(null)}>Next 14 days</button> : undefined} bodyClassName="px-4 pb-4 md:px-5">
            {side.length ? side.map((x) => <Row key={x.o.id} x={x} compact />) : <p className="py-4 text-sm text-ink-3">{day ? "Nothing on this day." : "Nothing due in the next two weeks."}</p>}
          </Section>
        </div>
      ) : (
        <TableWrap className="border-t border-rule">
          <table className="tbl min-w-[760px]">
            <thead>
              <tr>
                <th className="w-[90px]">Date</th>
                <th>Commitment</th>
                <th className="w-[160px]">Category</th>
                <th className="w-[150px]">Pays from</th>
                <th className="r w-[120px]">Amount</th>
                <th className="w-[130px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {inMonth.map((x) => {
                const c = getCommitment(x.o.commitmentId)!;
                const red = x.status === "due" || x.status === "overdue";
                return (
                  <tr key={x.o.id} data-clickable="true" onClick={() => inspect({ kind: "commitment", id: x.o.id })} className={cx(x.status === "overdue" && "bg-red-wash/60")}>
                    <td>
                      <DateMark date={x.o.date} tone={red ? "due" : x.status === "paid" ? "muted" : "default"} />
                    </td>
                    <td className={cx("font-medium", x.status === "paid" ? "text-ink-3" : "text-ink")}>{c.name}</td>
                    <td className="text-ink-2">{getCategory(c.categoryId).name}</td>
                    <td className="text-ink-2">{ledgerAccountShort(c.payFromId)}</td>
                    <td className="r">
                      <Money value={x.amount} className={cx("num font-semibold", x.status === "paid" && "struck font-normal")} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {red ? (
                        <button type="button" className="btn btn-sm h-6 px-2" onClick={() => pay(x.o)}>
                          Mark paid
                        </button>
                      ) : (
                        <OccurrenceTag status={x.status} paidOn={x.paidOn} autopay={c.autopay} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {!inMonth.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-ink-3">
                    No {kind === "all" ? "" : KINDS.find((k) => k.id === kind)!.label.toLowerCase() + " "}commitments in {formatMonth(month, "MMMM yyyy")}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      )}

      <Section title="Recurring commitments" meta={`${COMMITMENTS.length} on record`} className="mt-2">
        <TableWrap>
          <table className="tbl min-w-[760px]">
            <thead>
              <tr>
                <th>Name</th>
                <th className="w-[110px]">Repeats</th>
                <th className="w-[90px]">On</th>
                <th className="w-[150px]">Pays from</th>
                <th className="w-[110px]">Payment</th>
                <th className="r w-[120px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {COMMITMENTS.filter((c) => match(c.kind)).map((c) => {
                const next = OCCURRENCES.find((o) => o.commitmentId === c.id && o.date >= AS_OF) ?? OCCURRENCES.filter((o) => o.commitmentId === c.id).at(-1);
                return (
                  <tr key={c.id} data-clickable={Boolean(next)} onClick={() => next && inspect({ kind: "commitment", id: next.id })}>
                    <td className="font-medium text-ink">{c.name}</td>
                    <td className="text-ink-2">{c.cadence}</td>
                    <td className="num text-ink-2">{c.cadence === "Yearly" && next ? formatDate(next.date, "d MMM") : `${c.day}${c.day === 1 || c.day === 21 ? "st" : c.day === 2 ? "nd" : c.day === 3 ? "rd" : "th"}`}</td>
                    <td className="text-ink-2">{ledgerAccountShort(c.payFromId)}</td>
                    <td>{c.autopay ? <span className="inline-flex items-center gap-1 text-xs text-ink-2"><Repeat2 size={12} aria-hidden /> Autopay</span> : <span className="text-xs text-ink-3">Manual</span>}</td>
                    <td className="r">
                      {c.variable ? <span className="text-xs text-ink-3">varies · </span> : null}
                      <Money value={next?.amount ?? c.amount} className="num" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>
    </div>
  );
}
