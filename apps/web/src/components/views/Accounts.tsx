"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Inbox, Lock, Plus } from "lucide-react";
import {
  AS_OF,
  CASH_ACCOUNTS,
  DATA_START_DATE,
  accountLedger,
  getCategory,
  getGoal,
  netWorthNow,
  CARDS,
  cardStatus,
} from "@myfinancespace/core/data";
import { addDays, addMonths, diffDays, formatDate, formatMonth, relativeDays, weekday } from "@myfinancespace/core/format";
import { useLedger, useUI } from "@/components/workspace/state";
import { Money, Pct } from "@/components/ui/money";
import { DateMark, EmptyState, Facts, Metric, MetricStrip, OccurrenceTag, PageHeader, Progress, Section } from "@/components/ui/primitives";
import { SegmentBar } from "@/components/charts/SegmentBar";
import { TrendChart } from "@/components/charts/TrendChart";
import { TableWrap } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";

const KIND: Record<string, string> = { savings: "Savings", current: "Current", cash: "Cash", fd: "Fixed deposit", rd: "Recurring deposit" };

export function AccountsView() {
  const { txns } = useLedger();
  const { inspect, inspector } = useUI();
  const nw = netWorthNow(txns);
  const liquid = CASH_ACCOUNTS.filter((a) => a.liquid);
  const deposits = CASH_ACCOUNTS.filter((a) => !a.liquid);
  const cardsOwed = CARDS.reduce((s, c) => s + cardStatus(c.id, txns).outstanding, 0);
  const selected = inspector?.kind === "account" ? inspector.id : null;
  const balanceOf = (id: string) => accountLedger(id, txns)[0]?.balance ?? CASH_ACCOUNTS.find((a) => a.id === id)!.balance;

  return (
    <div>
      <PageHeader
        title="Accounts & cash"
        meta={`Bank balances, cash and deposits · as of ${formatDate(AS_OF)}`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => inspect({ kind: "new-transaction", id: "new" })}>
            <Plus size={14} strokeWidth={2.4} aria-hidden /> Add transaction
          </button>
        }
      />
      <MetricStrip className="mt-4">
        <Metric label="Cash and deposits" value={<Money value={nw.cash} compact="pref" />} sub={<><Pct value={(nw.cash / nw.netWorth) * 100} /> of net worth</>} />
        <Metric label="Available now" value={<Money value={nw.liquid} compact="pref" />} sub={`${liquid.length} accounts, no lock-in`} />
        <Metric label="In deposits" value={<Money value={nw.deposits} compact="pref" />} sub="2 fixed, 1 recurring" />
        <Metric label="Owed on cards" value={<Money value={cardsOwed} compact="pref" />} sub="Paid from these accounts" href="/liabilities" />
      </MetricStrip>

      <Section title="Where your cash sits" meta="available balances" bodyClassName="px-4 pb-5 md:px-6" className="mt-1">
        <SegmentBar
          variant="tall"
          label="Available cash by account"
          segments={liquid.map((a, i) => ({
            key: a.id,
            label: a.kind === "cash" ? "Cash in hand" : a.name,
            value: balanceOf(a.id),
            color: `var(--c${[1, 2, 3, 6, 4][i]})`,
            onClick: () => inspect({ kind: "account", id: a.id }),
          }))}
        />
      </Section>

      <Section title="Savings & cash" meta={`${liquid.length} accounts`} className="border-t border-rule">
        <TableWrap>
          <table className="tbl min-w-[720px]">
            <thead>
              <tr>
                <th>Account</th>
                <th className="w-[110px]">Type</th>
                <th className="r w-[90px]">Interest</th>
                <th className="w-[120px]">Last activity</th>
                <th className="r w-[140px]">Balance</th>
                <th className="w-[44px]">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {liquid.map((a) => {
                const ledger = accountLedger(a.id, txns);
                return (
                  <tr key={a.id} data-clickable="true" aria-selected={selected === a.id} onClick={() => inspect({ kind: "account", id: a.id })}>
                    <td>
                      <div className="font-medium text-ink">
                        {a.name}
                        {a.mask && <span className="ml-1 font-normal text-ink-3">••{a.mask}</span>}
                      </div>
                      <div className="text-xs text-ink-3">
                        {a.role}
                      </div>
                    </td>
                    <td className="text-ink-2">{KIND[a.kind]}</td>
                    <td className="r num text-ink-2">{a.interestRate ? `${a.interestRate}%` : "—"}</td>
                    <td>{ledger[0] ? <DateMark date={ledger[0].txn.date} /> : <span className="text-ink-3">—</span>}</td>
                    <td className="r">
                      <Money value={ledger[0]?.balance ?? a.balance} className="num font-semibold" />
                    </td>
                    <td className="r">
                      <Link href={`/accounts/${a.id}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost btn-sm btn-icon" aria-label={`Open ${a.name}`}>
                        <ChevronRight size={16} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title="Deposits" meta="locked until maturity" className="mt-2">
        <TableWrap>
          <table className="tbl min-w-[820px]">
            <thead>
              <tr>
                <th>Deposit</th>
                <th className="r w-[80px]">Rate</th>
                <th className="r w-[120px]">Principal</th>
                <th className="r w-[130px]">Value today</th>
                <th className="w-[150px]">Matures</th>
                <th className="r w-[130px]">At maturity</th>
                <th className="w-[44px]">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((a) => {
                const soon = diffDays(a.maturityDate!, AS_OF) <= 30;
                return (
                  <tr key={a.id} data-clickable="true" aria-selected={selected === a.id} onClick={() => inspect({ kind: "account", id: a.id })}>
                    <td>
                      <div className="font-medium text-ink">
                        {a.name} <span className="font-normal text-ink-3">••{a.mask}</span>
                      </div>
                      <div className="text-xs text-ink-3">
                        {a.goalId ? <>For {getGoal(a.goalId)?.name.toLowerCase()}</> : a.role}
                        {a.kind === "rd" && (
                          <>
                            {" "}
                            · {a.installmentsPaid} of {a.installmentsTotal} installments
                          </>
                        )}
                      </div>
                    </td>
                    <td className="r num text-ink-2">{a.interestRate}%</td>
                    <td className="r">
                      <Money value={a.principal!} className="num text-ink-2" />
                    </td>
                    <td className="r">
                      <Money value={a.balance} className="num font-semibold" />
                    </td>
                    <td>
                      <DateMark date={a.maturityDate!} /> <span className="text-xs text-ink-3">{formatDate(a.maturityDate!, "MMM yyyy").slice(4)}</span>
                      <div className={cx("text-xs", soon ? "font-semibold text-ink" : "text-ink-3")}>{relativeDays(a.maturityDate!, AS_OF)}{soon && " · decide on renewal"}</div>
                    </td>
                    <td className="r">
                      <Money value={a.maturityAmount!} className="num" />
                    </td>
                    <td className="r">
                      <Link href={`/accounts/${a.id}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost btn-sm btn-icon" aria-label={`Open ${a.name}`}>
                        <ChevronRight size={16} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <p className="px-4 py-3 text-xs text-ink-3 md:px-6">
          Deposit values include interest accrued to {formatDate(AS_OF, "d MMM")}. Breaking a deposit early usually costs 0.5–1% of the rate.
        </p>
      </Section>
    </div>
  );
}

/* ───────────── One account: the passbook ───────────── */

export function AccountDetail({ id }: { id: string }) {
  const { txns } = useLedger();
  const { inspect, inspector } = useUI();
  const [range, setRange] = useState<"30" | "90" | "all">("90");
  const [q, setQ] = useState("");
  const a = CASH_ACCOUNTS.find((x) => x.id === id)!;
  const deposit = a.kind === "fd" || a.kind === "rd";
  const ledger = accountLedger(id, txns);
  const balance = deposit ? a.balance : (ledger[0]?.balance ?? a.balance);
  const since = range === "all" ? "0000" : addDays(AS_OF, -Number(range) + 1);
  const rows = ledger.filter((r) => r.txn.date >= since && (!q || r.txn.description.toLowerCase().includes(q.toLowerCase())));
  const last30 = ledger.filter((r) => r.txn.date >= addDays(AS_OF, -29));
  const in30 = last30.reduce((s, r) => s + Math.max(0, r.amount), 0);
  const out30 = last30.reduce((s, r) => s + Math.min(0, r.amount), 0);
  const selected = inspector?.kind === "transaction" ? inspector.id : null;

  // End-of-week balances for the trend
  const trend: { label: string; title: string; value: number }[] = [];
  if (!deposit && ledger.length) {
    const asc = [...ledger].reverse();
    const opening = asc[0].balance - asc[0].amount;
    // First week ending (Sunday) on or after the ledger starts
    let cursor = addDays(DATA_START_DATE, (7 - weekday(DATA_START_DATE)) % 7);
    let i = 0;
    let bal = opening;
    while (cursor <= AS_OF) {
      while (i < asc.length && asc[i].txn.date <= cursor) bal = asc[i++].balance;
      trend.push({ label: formatDate(cursor, "MMM"), title: `Week ending ${formatDate(cursor, "d MMM")}`, value: bal });
      cursor = addDays(cursor, 7);
    }
    trend.push({ label: "Now", title: formatDate(AS_OF, "d MMM yyyy"), value: balance });
  }

  return (
    <div>
      <PageHeader
        title={
          <span>
            {a.name}
            {a.mask && <span className="ml-2 text-base font-normal text-ink-3">••{a.mask}</span>}
          </span>
        }
        meta={`${a.institution} · ${KIND[a.kind]} · ${a.role}`}
        actions={
          <>
            <Link href="/accounts" className="btn">
              All accounts
            </Link>
            {!deposit && (
              <Link href={`/transactions?account=${id}&period=all`} className="btn">
                Open in ledger
              </Link>
            )}
            {!deposit && (
              <button type="button" className="btn btn-primary" onClick={() => inspect({ kind: "new-transaction", id: "new", preset: { accountId: id } })}>
                <Plus size={14} strokeWidth={2.4} aria-hidden /> Add
              </button>
            )}
          </>
        }
      />

      {deposit ? (
        <DepositDetail id={id} />
      ) : (
        <>
          <MetricStrip className="mt-4">
            <Metric label="Balance" value={<Money value={balance} />} sub={`as of ${formatDate(AS_OF, "d MMM")}`} size="lg" />
            <Metric label="In, last 30 days" value={<Money value={in30} sign="always" tone="flow" />} sub={`${last30.filter((r) => r.amount > 0).length} credits`} />
            <Metric label="Out, last 30 days" value={<Money value={out30} />} sub={`${last30.filter((r) => r.amount < 0).length} debits`} />
            <Metric label="Interest" value={a.interestRate ? `${a.interestRate}%` : "None"} sub={a.interestRate ? "per year, credited quarterly" : "Cash earns nothing"} />
          </MetricStrip>
          {trend.length > 2 && (
            <Section title="Balance" meta="end of each week since May" bodyClassName="px-4 pb-4 md:px-6">
              <TrendChart points={trend} height={120} label={`${a.name} balance by week`} xEvery={4} color="var(--pen)" />
            </Section>
          )}
          <Section
            title="Passbook"
            meta={`${rows.length} entries`}
            className="border-t border-rule"
            actions={
              <>
                <input className="input h-[26px] w-44 text-xs" placeholder="Search entries" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search passbook" />
                <div className="seg" role="group" aria-label="Period">
                  {(["30", "90", "all"] as const).map((r) => (
                    <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
                      {r === "all" ? "Since May" : `${r} days`}
                    </button>
                  ))}
                </div>
              </>
            }
          >
            {rows.length ? (
              <TableWrap>
                <table className="tbl min-w-[720px]">
                  <thead>
                    <tr>
                      <th className="w-[88px]">Date</th>
                      <th>Particulars</th>
                      <th className="w-[160px]">Category</th>
                      <th className="r w-[120px]">Withdrawal</th>
                      <th className="r w-[120px]">Deposit</th>
                      <th className="r w-[130px]">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.txn.id} data-clickable="true" aria-selected={selected === r.txn.id} onClick={() => inspect({ kind: "transaction", id: r.txn.id })}>
                        <td>
                          <DateMark date={r.txn.date} />
                        </td>
                        <td className="max-w-0">
                          <span className={cx("block truncate", r.txn.source === "manual" ? "text-pen" : "text-ink")}>{r.txn.description}</span>
                          <span className="block truncate text-xs text-ink-3">{r.txn.method}</span>
                        </td>
                        <td className="truncate text-ink-2">{getCategory(r.txn.categoryId).name}</td>
                        <td className="r num">{r.amount < 0 ? <Money value={-r.amount} /> : ""}</td>
                        <td className="r num">{r.amount > 0 ? <Money value={r.amount} className="text-green" /> : ""}</td>
                        <td className="r num font-medium">
                          <Money value={r.balance} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <EmptyState icon={Inbox} title="No entries in this period" body="Try a longer period or clear the search." />
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function DepositDetail({ id }: { id: string }) {
  const a = CASH_ACCOUNTS.find((x) => x.id === id)!;
  const goal = a.goalId ? getGoal(a.goalId) : undefined;
  const isRd = a.kind === "rd";
  const termMonths = isRd ? a.installmentsTotal! : 12;
  const installments = isRd
    ? Array.from({ length: a.installmentsTotal! }, (_, i) => {
        const date = addMonths(a.openedOn, i, 3);
        return { n: i + 1, date, paid: i < a.installmentsPaid! };
      })
    : [];
  const elapsed = Math.max(0, Math.min(1, diffDays(AS_OF, a.openedOn) / diffDays(a.maturityDate!, a.openedOn)));
  return (
    <>
      <MetricStrip className="mt-4">
        <Metric label="Value today" value={<Money value={a.balance} />} sub="Principal plus accrued interest" size="lg" />
        <Metric label="At maturity" value={<Money value={a.maturityAmount!} />} sub={formatDate(a.maturityDate!)} />
        <Metric label="Rate" value={`${a.interestRate}%`} sub={isRd ? "Compounded quarterly" : "Cumulative, paid at maturity"} />
        <Metric label="Matures" value={relativeDays(a.maturityDate!, AS_OF)} sub={`${termMonths}-month term`} />
      </MetricStrip>
      <div className="grid gap-px border-b border-rule bg-rule @container lg:grid-cols-2 [&>*]:bg-paper">
        <Section title="Term" bodyClassName="px-4 pb-5 md:px-6">
          <Progress value={elapsed} />
          <div className="mt-1.5 flex justify-between text-xs text-ink-3">
            <span>Opened {formatDate(a.openedOn)}</span>
            <span>{Math.round(elapsed * 100)}% of the term</span>
          </div>
          <Facts
            className="mt-4"
            items={[
              ["Principal", <Money key="p" value={a.principal!} />],
              ["Interest earned so far", <Money key="i" value={a.balance - a.principal!} />],
              ["Interest at maturity", <Money key="m" value={a.maturityAmount! - (isRd ? a.installment! * a.installmentsTotal! : a.principal!)} />],
              ["Earmarked for", goal ? goal.name : "Nothing yet"],
            ]}
          />
          <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-3">
            <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
            Locked until {formatDate(a.maturityDate!)}. On maturity the money returns to {a.institution} savings unless you renew it.
          </p>
        </Section>
        {isRd ? (
          <Section title="Installments" meta={`₹${a.installment!.toLocaleString("en-IN")} on the 3rd of every month`} bodyClassName="px-4 pb-4 md:px-6">
            <ol className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              {installments.map((r) => (
                <li key={r.n} className="flex items-center justify-between border-b border-rule py-1.5 text-sm">
                  <span className="flex items-baseline gap-2">
                    <span className="num w-5 text-xs text-ink-3">{r.n}</span>
                    <span className={cx(r.paid ? "text-ink-3" : "text-ink")}>{formatMonth(r.date.slice(0, 7), "MMM yy")}</span>
                  </span>
                  {r.paid ? <OccurrenceTag status="paid" /> : <span className="text-xs text-ink-3">{r.n === a.installmentsPaid! + 1 ? "next" : ""}</span>}
                </li>
              ))}
            </ol>
          </Section>
        ) : (
          <Section title="What happens at maturity" bodyClassName="px-4 pb-5 text-sm text-ink-2 md:px-6">
            <p>
              <Money value={a.maturityAmount!} className="font-semibold text-ink" /> will be credited to your {a.institution} savings account on {formatDate(a.maturityDate!)}.
            </p>
            <p className="mt-2">
              {goal
                ? `It is part of ${goal.name.toLowerCase()}, so renewing it keeps that goal funded.`
                : "It is not earmarked for any goal."}
            </p>
          </Section>
        )}
      </div>
    </>
  );
}
