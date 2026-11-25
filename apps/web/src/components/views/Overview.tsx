"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ISODate, MonthKey } from "@myfinancespace/core/types";
import {
  AS_OF,
  AS_OF_MONTH,
  DAYS_LEFT_IN_MONTH,
  accountBalance,
  ASSET_CLASSES,
  attentionItems,
  budgetFor,
  CARDS,
  CASH_ACCOUNTS,
  cardStatus,
  getCommitment,
  GOALS,
  goalProgress,
  ledgerAccountShort,
  loanStatus,
  LOANS,
  monthFlows,
  monthRange,
  netWorthHistory,
  netWorthNow,
  OCCURRENCES,
  portfolioSummary,
  remainingBillAmount,
} from "@myfinancespace/core/data";
import { addMonths, diffDays, formatDate, formatLongDate, formatMonth, fyLabel, monthOf, monthSpanLabel } from "@myfinancespace/core/format";
import { useLedger, usePrefs, useUI } from "@/components/workspace/state";
import { usePayOccurrence } from "@/components/workspace/actions";
import { effectiveStatus } from "@myfinancespace/core/payments";
import { useAttentionAction } from "@/components/shell/Topbar";
import { Money, Delta, Pct } from "@/components/ui/money";
import { BudgetMeter, DateMark, OccurrenceTag, Progress, Section, SeverityIcon } from "@/components/ui/primitives";
import { TrendChart } from "@/components/charts/TrendChart";
import { Columns } from "@/components/charts/Columns";
import { SegmentBar } from "@/components/charts/SegmentBar";
import { MonthSheet } from "@/components/calendar/MonthSheet";
import { GoalStatus } from "@/components/inspector/panels";
import { cx } from "@/components/ui/cx";

/** Mini calendar: last month through two months ahead. */
const CAL_RANGE: MonthKey[] = monthRange(monthOf(addMonths(`${AS_OF_MONTH}-01`, -1)), monthOf(addMonths(`${AS_OF_MONTH}-01`, 2)));

function ViewLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs font-medium text-pen hover:underline">
      {children}
    </Link>
  );
}

export function Overview() {
  const { txns, paidOccurrences } = useLedger();
  const { prefs } = usePrefs();
  const { inspect } = useUI();
  const pay = usePayOccurrence();
  const act = useAttentionAction();
  const [month, setMonth] = useState<MonthKey>(AS_OF_MONTH);
  const [day, setDay] = useState<ISODate | null>(null);

  const nw = netWorthNow(txns);
  const hist = netWorthHistory(txns);
  const prev = hist[hist.length - 2];
  const change = nw.netWorth - prev.netWorth;
  const flows = monthFlows(txns);
  const nov = flows[flows.length - 1];
  const out = nov.spending + nov.emis + nov.invested;
  const budget = budgetFor(AS_OF_MONTH, txns);
  const budgetTotal = budget.reduce((s, b) => s + b.budget, 0);
  const spent = budget.reduce((s, b) => s + b.actual, 0);
  const goldCoin = txns.find((t) => t.description.startsWith("Tanishq"));
  const attention = attentionItems(txns, paidOccurrences, prefs.billReminderDays);
  const liquidAccounts = CASH_ACCOUNTS.filter((a) => a.liquid);
  const portfolio = portfolioSummary();
  const recent = txns.filter((t) => t.date <= AS_OF).slice(0, 8);
  const incomes = txns.filter((t) => t.type === "income" || t.type === "dividend" || t.type === "interest");
  const bills = OCCURRENCES.map((o) => {
    const status = effectiveStatus(o, paidOccurrences);
    return { o, ...status, amount: status.status === "paid" ? o.amount : remainingBillAmount(o, txns) };
  });
  const upcoming = bills.filter(({ o }) => o.date >= `${AS_OF_MONTH}-01` && diffDays(o.date, AS_OF) <= 10)
    .filter((x) => x.status !== "paid" || paidOccurrences.has(x.o.id))
    .slice(0, 8);
  const dayEntries = day ? bills.filter(({ o }) => o.date === day) : [];
  const mi = CAL_RANGE.indexOf(month);

  return (
    <div className="@container">
      <div className="flex flex-wrap items-end justify-between gap-2 px-4 pt-4 pb-3 md:px-6 md:pt-5">
        <div>
          <h1 className="text-xl font-[650] tracking-[-0.01em]">Overview</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {formatLongDate(AS_OF)} · {fyLabel(AS_OF, prefs.fyStartMonth)}, month {prefs.fyStartMonth === 4 ? 8 : 11} of 12
          </p>
        </div>
        <Link href="/financial-plan" className="btn">
          Financial plan <ChevronRight size={14} aria-hidden />
        </Link>
      </div>

      {/* ───── Position: where do I stand? ───── */}
      <div className="grid gap-px border-y border-rule bg-rule @3xl:grid-cols-2 @6xl:grid-cols-12 [&>*]:bg-paper">
        <div className="px-4 py-4 md:px-6 @3xl:col-span-2 @6xl:col-span-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Link href="/net-worth" className="label hover:text-pen">
              Net worth
            </Link>
            <span className="text-xs text-ink-3">24 months</span>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href="/net-worth" className="figure text-[40px] text-ink hover:text-pen">
              <Money value={nw.netWorth} compact="pref" />
            </Link>
            <span className="text-sm">
              <Delta value={change} pct={(change / prev.netWorth) * 100} /> <span className="text-ink-3">{`since ${formatMonth(prev.month, "MMMM")}`}</span>
            </span>
          </div>
          <TrendChart
            className="mt-3"
            height={92}
            label={`Net worth, ${monthSpanLabel(hist[0].month, hist[hist.length - 1].month)}`}
            xEvery={6}
            points={hist.map((h) => ({ label: formatMonth(h.month, "MMM yy"), title: formatMonth(h.month, "MMMM yyyy"), value: h.netWorth }))}
          />
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-rule pt-3 text-sm">
            <Link href="/net-worth" className="group">
              <span className="label group-hover:text-pen">Assets</span>
              <Money value={nw.assets} compact="pref" className="figure block text-xl text-ink" />
            </Link>
            <Link href="/liabilities" className="group">
              <span className="label group-hover:text-pen">Liabilities</span>
              <Money value={nw.liabilities} compact="pref" className="figure block text-xl text-ink" />
            </Link>
          </div>
        </div>

        <div className="px-4 py-4 md:px-5 @6xl:col-span-3">
          <div className="flex items-baseline justify-between">
            <Link href="/accounts" className="label hover:text-pen">
              Cash you can use
            </Link>
            <ViewLink href="/accounts">Accounts</ViewLink>
          </div>
          <Money value={nw.liquid} compact="pref" className="figure mt-1 block text-3xl text-ink" />
          <ul className="mt-3 -mx-1.5">
            {liquidAccounts.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => inspect({ kind: "account", id: a.id })} className="flex w-full items-baseline justify-between gap-3 rounded-[3px] px-1.5 py-1 text-sm hover:bg-paper-2">
                  <span className="truncate text-ink-2">{ledgerAccountShort(a.id)}</span>
                  <Money value={accountBalance(a.id, txns)} className="num text-ink" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-3">
            Plus <Money value={nw.deposits} compact="pref" className="font-semibold text-ink-2" /> in fixed and recurring deposits.
          </p>
        </div>

        <div className="px-4 py-4 md:px-5 @6xl:col-span-4">
          <div className="flex items-baseline justify-between">
            <Link href="/budget" className="label hover:text-pen">
              {`${formatMonth(AS_OF_MONTH, "MMMM")} so far`}
            </Link>
            <span className="text-xs text-ink-3">{`${DAYS_LEFT_IN_MONTH} days left`}</span>
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">Money in</dt>
              <dd>
                <Money value={nov.income} sign="always" tone="flow" className="num font-semibold" />
              </dd>
            </div>
            <div>
              <div className="flex justify-between">
                <dt className="text-ink-2">
                  Spending <span className="text-ink-3">· {Math.round((spent / budgetTotal) * 100)}% of budget</span>
                </dt>
                <dd>
                  <Money value={-nov.spending} className="num" />
                </dd>
              </div>
              <BudgetMeter ratio={spent / budgetTotal} className="mt-1" height={4} />
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Loan EMIs</dt>
              <dd>
                <Money value={-nov.emis} className="num" />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Invested</dt>
              <dd>
                <Money value={-nov.invested} className="num" />
              </dd>
            </div>
            <div className="flex justify-between border-t border-rule pt-1.5">
              <dt className="font-semibold text-ink">Net cash flow</dt>
              <dd>
                <Money value={nov.income - out} sign="always" tone="gain" className="num font-semibold" />
              </dd>
            </div>
          </dl>
          {goldCoin && (
            <p className="mt-2 text-xs text-ink-3">
              Includes the{" "}
              <button type="button" className="text-pen hover:underline" onClick={() => inspect({ kind: "transaction", id: goldCoin.id })}>
                Dhanteras gold coin
              </button>{" "}
              (<Money value={-goldCoin.amount} />) bought from savings.
            </p>
          )}
        </div>
      </div>

      {/* ───── This month's sheet + what needs attention ───── */}
      <div className="grid gap-px border-b border-rule bg-rule @5xl:grid-cols-12 [&>*]:bg-paper">
        <Section
          className="@5xl:col-span-8"
          id="sheet"
          title={formatMonth(month, "MMMM yyyy")}
          meta={month === AS_OF_MONTH ? "What has cleared, what is still due" : undefined}
          actions={
            <>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" disabled={mi <= 0} onClick={() => (setMonth(CAL_RANGE[mi - 1]), setDay(null))} aria-label="Previous month">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button type="button" className="btn btn-sm" disabled={month === AS_OF_MONTH} onClick={() => (setMonth(AS_OF_MONTH), setDay(null))}>
                This month
              </button>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" disabled={mi >= CAL_RANGE.length - 1} onClick={() => (setMonth(CAL_RANGE[mi + 1]), setDay(null))} aria-label="Next month">
                <ChevronRight size={16} aria-hidden />
              </button>
            </>
          }
          bodyClassName="px-4 pb-4 md:px-5"
        >
          <MonthSheet
            month={month}
            occurrences={bills.map(({ o, amount }) => ({ ...o, amount }))}
            incomes={incomes}
            paid={paidOccurrences}
            selected={day}
            onSelect={(d) => setDay((cur) => (cur === d ? null : d))}
            onOpen={(o) => inspect({ kind: "commitment", id: o.id })}
            weekStart={prefs.weekStart}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="daynum text-sm text-red">28</span> money due
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="daynum pen-ring grid h-5 min-w-5 place-items-center px-0.5 text-sm text-ink">22</span> today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-ink-3 line-through">Paid</span> cleared
            </span>
            <span>Green figures are money received</span>
          </div>

          <div className="mt-4 border-t border-rule pt-3">
            {day ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{formatDate(day, "EEE, d MMM")}</h3>
                  <button type="button" className="text-xs font-medium text-pen hover:underline" onClick={() => setDay(null)}>
                    Show coming up
                  </button>
                </div>
                {dayEntries.length ? (
                  <OccList entries={dayEntries} onOpen={(id) => inspect({ kind: "commitment", id })} onPay={pay} />
                ) : (
                  <p className="text-sm text-ink-3">Nothing scheduled on this day.</p>
                )}
              </>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Coming up in the next 10 days</h3>
                  <ViewLink href="/calendar">Bills & calendar</ViewLink>
                </div>
                <OccList entries={upcoming} onOpen={(id) => inspect({ kind: "commitment", id })} onPay={pay} />
              </>
            )}
          </div>
        </Section>

        <Section className="@5xl:col-span-4" id="attention" title="Needs attention" meta={`${attention.length} items`} bodyClassName="pb-2">
          <ul>
            {attention.map((it) => (
              <li key={it.id} className="border-t border-rule first:border-t-0">
                <div className="flex gap-3 px-4 py-3 md:px-5">
                  <span className="mt-0.5">
                    <SeverityIcon severity={it.severity} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{it.title}</p>
                    <p className="mt-0.5 text-xs text-ink-3">{it.detail}</p>
                    <button type="button" className="mt-1.5 text-xs font-semibold text-pen hover:underline" onClick={() => act(it)}>
                      {it.action}
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {!attention.length && <li className="px-5 py-6 text-sm text-ink-3">Nothing needs you right now.</li>}
          </ul>
        </Section>
      </div>

      {/* ───── What changed: spending, flows, activity ───── */}
      <div className="grid gap-px border-b border-rule bg-rule @3xl:grid-cols-2 @6xl:grid-cols-3 [&>*]:bg-paper">
        <Section title="Budget exceptions" meta={formatMonth(AS_OF_MONTH, "MMMM")} actions={<ViewLink href="/budget">Budget</ViewLink>} bodyClassName="px-4 pb-4 md:px-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">
              <Money value={spent} className="font-semibold text-ink" /> of <Money value={budgetTotal} /> spent
            </span>
            <Pct value={(spent / budgetTotal) * 100} decimals={0} className="text-ink-3" />
          </div>
          <ul className="mt-3 space-y-2.5">
            {[...budget]
              .sort((a, b) => b.ratio - a.ratio)
              .slice(0, 5)
              .map((b) => (
                <li key={b.category.id}>
                  <Link href={`/transactions?category=${b.category.id}&period=month`} className="group block">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-ink group-hover:text-pen">{b.category.name}</span>
                      <span className="num shrink-0 text-xs text-ink-3">
                        <Money value={b.actual} className={cx("text-sm", b.ratio > 1 ? "font-semibold text-red" : "text-ink")} /> / <Money value={b.budget} compact />
                      </span>
                    </div>
                    <BudgetMeter ratio={b.ratio} className="mt-1" height={5} />
                  </Link>
                </li>
              ))}
          </ul>
        </Section>

        <Section title="Cash flow" meta="last 6 months" actions={<ViewLink href="/reports">Reports</ViewLink>} bodyClassName="px-4 pb-4 md:px-5">
          <Columns
            label={`Money in versus money out, ${monthSpanLabel(flows[flows.length - 6].month, flows[flows.length - 1].month)}`}
            height={136}
            data={flows.slice(-6).map((f) => ({
              label: formatMonth(f.month, "MMM"),
              title: formatMonth(f.month, "MMMM yyyy") + (f.month === AS_OF_MONTH ? " (to date)" : ""),
              values: { income: f.income, spending: f.spending, invested: f.invested, emis: f.emis },
              highlight: f.month === AS_OF_MONTH,
            }))}
            series={[
              { key: "income", label: "Money in", color: "var(--c1)" },
              { key: "spending", label: "Spending", color: "var(--c2)", stack: "out" },
              { key: "invested", label: "Invested", color: "var(--c3)", stack: "out" },
              { key: "emis", label: "EMIs", color: "var(--c4)", stack: "out" },
            ]}
          />
        </Section>

        <Section className="@3xl:col-span-2 @6xl:col-span-1" title="Recent activity" actions={<ViewLink href="/transactions?period=all">All transactions</ViewLink>} bodyClassName="pb-2">
          <ul>
            {recent.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => inspect({ kind: "transaction", id: t.id })} className="flex w-full items-center gap-3 border-t border-rule px-4 py-1.5 text-left first:border-t-0 hover:bg-paper-2 md:px-5">
                  <DateMark date={t.date} className="w-[50px] shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{t.description}</span>
                    <span className="block truncate text-xs text-ink-3">{ledgerAccountShort(t.accountId)}</span>
                  </span>
                  <Money value={t.amount} tone="flow" className="num text-sm" />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* ───── Wealth & obligations ───── */}
      <div className="grid gap-px border-b border-rule bg-rule @3xl:grid-cols-2 @6xl:grid-cols-3 [&>*]:bg-paper">
        <Section title="Investments" actions={<ViewLink href="/investments">Portfolio</ViewLink>} bodyClassName="px-4 pb-4 md:px-5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <Money value={portfolio.current} compact="pref" className="figure text-2xl" />
            <span className="text-sm">
              <Money value={portfolio.gain} compact="pref" sign="always" tone="gain" /> <span className="text-ink-3">unrealised</span>
            </span>
          </div>
          <SegmentBar
            className="mt-3"
            label="Portfolio by asset class"
            showLegend={false}
            segments={portfolio.byClass.map((c) => ({ key: c.id, label: c.name, value: c.current, color: `var(--c${c.slot})`, onClick: undefined }))}
          />
          <ul className="mt-3 space-y-1">
            {portfolio.byClass.map((c) => (
              <li key={c.id}>
                <Link href={`/investments?class=${c.id}`} className="group flex items-center gap-2 text-sm">
                  <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: `var(--c${c.slot})` }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-ink-2 group-hover:text-pen">{ASSET_CLASSES.find((a) => a.id === c.id)!.name}</span>
                  <Pct value={(c.current / portfolio.current) * 100} decimals={0} className="num w-10 text-right text-xs text-ink-3" />
                  <Money value={c.current} compact className="num w-16 text-right text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Loans & cards" actions={<ViewLink href="/liabilities">Liabilities</ViewLink>} bodyClassName="px-4 pb-4 md:px-5">
          <ul className="space-y-3">
            {LOANS.map((l) => {
              const s = loanStatus(l.id);
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => inspect({ kind: "loan", id: l.id })} className="group block w-full text-left">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-ink group-hover:text-pen">{l.name}</span>
                      <Money value={s.outstanding} compact="pref" className="num font-semibold" />
                    </div>
                    <Progress value={s.progress} className="mt-1" height={4} />
                    <div className="mt-0.5 flex justify-between text-xs text-ink-3">
                      <span>{Math.round(s.progress * 100)}% repaid</span>
                      <span>
                        EMI <Money value={l.emi} /> · {formatDate(s.next!.date, "d MMM")}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
            {CARDS.map((c) => {
              const s = cardStatus(c.id, txns);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => inspect({ kind: "card", id: c.id })} className="group flex w-full items-baseline justify-between gap-2 text-left text-sm">
                    <span className="truncate text-ink group-hover:text-pen">{c.name}</span>
                    <span className="text-xs text-ink-3">
                      <Pct value={s.utilization * 100} decimals={0} /> used · <Money value={s.outstanding} className="num text-sm font-semibold text-ink" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section className="@3xl:col-span-2 @6xl:col-span-1" title="Goals" actions={<ViewLink href="/goals">All goals</ViewLink>} bodyClassName="px-4 pb-4 md:px-5">
          <ul className="space-y-3">
            {GOALS.map((g) => {
              const p = goalProgress(g.id);
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => inspect({ kind: "goal", id: g.id })} className="group block w-full text-left">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-ink group-hover:text-pen">{g.name}</span>
                      <span className="num shrink-0 text-xs text-ink-3">
                        <Money value={p.saved} compact className="text-sm font-semibold text-ink" /> / <Money value={g.target} compact />
                      </span>
                    </div>
                    <Progress value={p.ratio} tone={g.status === "behind" ? "amber" : "ink"} className="mt-1" height={4} />
                    <div className="mt-0.5 flex items-center justify-between text-xs text-ink-3">
                      <span>by {formatDate(g.targetDate, "MMM yyyy")}</span>
                      {g.status !== "on_track" && <GoalStatus status={g.status} />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function OccList({
  entries,
  onOpen,
  onPay,
}: {
  entries: { o: (typeof OCCURRENCES)[number]; status: (typeof OCCURRENCES)[number]["status"]; paidOn?: string; amount: number }[];
  onOpen: (id: string) => void;
  onPay: (o: (typeof OCCURRENCES)[number]) => void;
}) {
  if (!entries.length) return <p className="text-sm text-ink-3">Nothing due in the next 10 days.</p>;
  return (
    <ul className="grid gap-x-6 @3xl:grid-cols-2">
      {entries.map(({ o, status, paidOn, amount }) => {
        const c = getCommitment(o.commitmentId)!;
        return (
          <li key={o.id} className="flex items-center gap-3 border-b border-rule py-1.5 last:border-b-0 @3xl:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
            <DateMark date={o.date} tone={status === "due" || status === "overdue" ? "due" : "default"} className="w-[50px] shrink-0" />
            <button type="button" onClick={() => onOpen(o.id)} className="min-w-0 flex-1 truncate text-left text-sm text-ink hover:text-pen hover:underline">
              {c.name}
            </button>
            <Money value={amount} className={cx("num text-sm", status === "paid" && "struck")} />
            <span className="w-[74px] text-right">
              {status === "due" || status === "overdue" ? (
                <button type="button" className="btn btn-sm h-6 px-2" onClick={() => onPay(o)} title={`Mark ${c.name} as paid`}>
                  Mark paid
                </button>
              ) : (
                <OccurrenceTag status={status} paidOn={paidOn} autopay={c.autopay} />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
