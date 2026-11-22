"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  AS_OF,
  CARDS,
  LOANS,
  OCCURRENCES,
  accountLedger,
  cardStatus,
  getAsset,
  getCommitment,
  ledgerAccountShort,
  loanSchedule,
  loanStatus,
  netWorthNow,
} from "@/lib/data";
import { diffDays, durationLabel, formatDate, relativeDays } from "@/lib/format";
import { useLedger, useUI } from "@/components/workspace/state";
import { effectiveStatus, usePayOccurrence } from "@/components/workspace/actions";
import { Money, Pct } from "@/components/ui/money";
import { BudgetMeter, DateMark, Facts, Metric, MetricStrip, OccurrenceTag, PageHeader, Progress, Section, Tag } from "@/components/ui/primitives";
import { SegmentBar } from "@/components/charts/SegmentBar";
import { Columns } from "@/components/charts/Columns";
import { TableWrap } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";

const TAKE_HOME = 246800;
const cardCommitment = (cardId: string) => (cardId === "hdfc-cc" ? "c-hdfc-cc" : "c-icici-cc");

export function LiabilitiesView() {
  const { txns, paidOccurrences } = useLedger();
  const { inspect, inspector } = useUI();
  const pay = usePayOccurrence();
  const nw = netWorthNow(txns);
  const loans = LOANS.map((l) => loanStatus(l.id));
  const cards = CARDS.map((c) => cardStatus(c.id, txns));
  const emis = LOANS.reduce((s, l) => s + l.emi, 0);
  const dues = cards.reduce((s, c) => s + c.outstanding, 0);
  const selected = inspector?.kind === "loan" || inspector?.kind === "card" ? inspector.id : null;
  const upcoming = OCCURRENCES.filter((o) => {
    const c = getCommitment(o.commitmentId)!;
    return (c.kind === "emi" || c.kind === "card") && o.date >= AS_OF && diffDays(o.date, AS_OF) <= 31;
  });

  return (
    <div>
      <PageHeader title="Loans & credit" meta="Everything you owe, what it costs each month, and when it ends" />
      <MetricStrip className="mt-4">
        <Metric label="Total owed" value={<Money value={nw.liabilities} compact="pref" />} sub={`${LOANS.length} loans and ${CARDS.length} cards`} size="lg" />
        <Metric label="EMIs each month" value={<Money value={emis} />} sub={<><Pct value={(emis / TAKE_HOME) * 100} decimals={0} /> of take-home pay</>} />
        <Metric label="Owed on cards" value={<Money value={dues} />} sub="Regalia bill due 28 Nov" />
        <Metric label="Debt to assets" value={<Pct value={(nw.liabilities / nw.assets) * 100} decimals={0} />} sub="Liabilities as a share of assets" />
      </MetricStrip>

      <Section title="What you owe" meta="by loan and card" bodyClassName="px-4 pb-5 md:px-6">
        <SegmentBar
          variant="tall"
          label="Liabilities by loan and card"
          segments={[
            ...loans.map((l, i) => ({ key: l.loan.id, label: `${l.loan.name} · ${l.loan.lender}`, value: l.outstanding, color: `var(--c${[5, 2, 3, 6][i]})`, onClick: () => inspect({ kind: "loan", id: l.loan.id }) })),
            { key: "cards", label: "Credit cards", value: dues, color: "var(--c4)" },
          ]}
        />
      </Section>

      <Section title="Loans" meta={`${LOANS.length} active`} className="border-t border-rule">
        <TableWrap>
          <table className="tbl min-w-[920px]">
            <thead>
              <tr>
                <th>Loan</th>
                <th className="r w-[120px]">Borrowed</th>
                <th className="r w-[130px]">Outstanding</th>
                <th className="r w-[90px]">Rate</th>
                <th className="r w-[100px]">EMI</th>
                <th className="w-[96px]">Next EMI</th>
                <th className="w-[180px]">Repaid</th>
                <th className="w-[44px]">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loans.map((s) => (
                <tr key={s.loan.id} data-clickable="true" aria-selected={selected === s.loan.id} onClick={() => inspect({ kind: "loan", id: s.loan.id })}>
                  <td>
                    <div className="font-medium text-ink">{s.loan.name}</div>
                    <div className="text-xs text-ink-3">
                      {s.loan.lender}
                      {s.loan.assetId && <> · {getAsset(s.loan.assetId)?.name}</>}
                    </div>
                  </td>
                  <td className="r num text-ink-2">
                    <Money value={s.loan.principal} />
                  </td>
                  <td className="r num font-semibold">
                    <Money value={s.outstanding} />
                  </td>
                  <td className="r num text-ink-2">{s.loan.rate ? `${s.loan.rate}%` : "0%"}</td>
                  <td className="r num">
                    <Money value={s.loan.emi} />
                  </td>
                  <td>{s.next && <DateMark date={s.next.date} />}</td>
                  <td>
                    <Progress value={s.progress} height={5} />
                    <div className="mt-1 flex justify-between text-xs text-ink-3">
                      <span>{Math.round(s.progress * 100)}%</span>
                      <span>{durationLabel(s.remainingCount)} left</span>
                    </div>
                  </td>
                  <td className="r">
                    <Link href={`/liabilities/${s.loan.id}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost btn-sm btn-icon" aria-label={`Open ${s.loan.name} schedule`}>
                      <ChevronRight size={16} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title="Credit cards" className="mt-2">
        <TableWrap>
          <table className="tbl min-w-[900px]">
            <thead>
              <tr>
                <th>Card</th>
                <th className="r w-[120px]">Limit</th>
                <th className="r w-[130px]">Outstanding</th>
                <th className="r w-[130px]">Statement</th>
                <th className="w-[140px]">Due</th>
                <th className="w-[170px]">Utilisation</th>
                <th className="w-[44px]">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cards.map((s) => {
                const occ = OCCURRENCES.find((o) => o.commitmentId === cardCommitment(s.card.id) && o.date === s.lastStatement?.due);
                const eff = occ ? effectiveStatus(occ, paidOccurrences) : undefined;
                return (
                  <tr key={s.card.id} data-clickable="true" aria-selected={selected === s.card.id} onClick={() => inspect({ kind: "card", id: s.card.id })}>
                    <td>
                      <div className="font-medium text-ink">
                        {s.card.name} <span className="font-normal text-ink-3">••{s.card.mask}</span>
                      </div>
                      <div className="text-xs text-ink-3">
                        {s.card.institution} · {s.card.autopayFrom ? `autopay from ${ledgerAccountShort(s.card.autopayFrom)}` : "paid manually"}
                      </div>
                    </td>
                    <td className="r num text-ink-2">
                      <Money value={s.card.limit} />
                    </td>
                    <td className="r num font-semibold">
                      <Money value={s.outstanding} />
                    </td>
                    <td className="r num">
                      <Money value={s.lastStatement?.amount ?? 0} className={cx(eff?.status === "paid" && "struck")} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {s.lastStatement && <DateMark date={s.lastStatement.due} tone={eff?.status === "due" ? "due" : "muted"} />}
                        {eff && <OccurrenceTag status={eff.status} paidOn={eff.paidOn} />}
                      </div>
                    </td>
                    <td>
                      <BudgetMeter ratio={s.utilization / 0.3} height={5} />
                      <div className="mt-1 text-xs text-ink-3">
                        <Pct value={s.utilization * 100} decimals={0} /> of limit
                      </div>
                    </td>
                    <td className="r">
                      <Link href={`/liabilities/${s.card.id}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost btn-sm btn-icon" aria-label={`Open ${s.card.name}`}>
                        <ChevronRight size={16} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <p className="px-4 py-3 text-xs text-ink-3 md:px-6">Utilisation bars mark 30% of the limit, the level lenders read as healthy.</p>
      </Section>

      <Section title="Payments in the next 30 days" className="border-t border-rule" bodyClassName="pb-3">
        <ul>
          {upcoming.map((o) => {
            const c = getCommitment(o.commitmentId)!;
            const eff = effectiveStatus(o, paidOccurrences);
            return (
              <li key={o.id} className="flex items-center gap-4 border-t border-rule px-4 py-2 first:border-t-0 md:px-6">
                <DateMark date={o.date} tone={eff.status === "due" || eff.status === "overdue" ? "due" : "default"} className="w-[52px]" />
                <button type="button" className="min-w-0 flex-1 truncate text-left text-sm hover:text-pen hover:underline" onClick={() => inspect({ kind: "commitment", id: o.id })}>
                  {c.name}
                  <span className="ml-2 text-xs text-ink-3">from {ledgerAccountShort(c.payFromId)}</span>
                </button>
                <span className="hidden text-xs text-ink-3 sm:block">{relativeDays(o.date, AS_OF)}</span>
                <Money value={o.amount} className={cx("num w-24 text-right text-sm font-semibold", eff.status === "paid" && "struck")} />
                <span className="w-24 text-right">
                  {eff.status === "due" ? (
                    <button type="button" className="btn btn-sm h-6 px-2" onClick={() => pay(o)}>
                      Mark paid
                    </button>
                  ) : (
                    <OccurrenceTag status={eff.status} paidOn={eff.paidOn} autopay={c.autopay} />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

/* ───────────── Loan detail ───────────── */

export function LoanDetail({ id }: { id: string }) {
  const { txns } = useLedger();
  const { inspect } = useUI();
  const [full, setFull] = useState(false);
  const s = loanStatus(id);
  const loan = s.loan;
  const rows = loanSchedule(id);
  const nextIdx = rows.findIndex((r) => r.date > AS_OF);
  const visible = full ? rows : rows.slice(Math.max(0, nextIdx - 3), nextIdx + 12);
  const asset = loan.assetId ? getAsset(loan.assetId) : undefined;
  const years = new Map<string, { principal: number; interest: number }>();
  rows.forEach((r) => {
    const y = r.date.slice(0, 4);
    const v = years.get(y) ?? { principal: 0, interest: 0 };
    v.principal += r.principal;
    v.interest += r.interest;
    years.set(y, v);
  });
  const emiTxns = txns.filter((t) => t.link?.kind === "loan" && t.link.id === id).slice(0, 6);

  return (
    <div>
      <PageHeader
        title={loan.name}
        meta={`${loan.lender}${loan.mask ? ` · ${loan.mask}` : ""} · ${loan.rateType === "Interest-free" ? "interest-free" : `${loan.rate}% ${loan.rateType.toLowerCase()}`}`}
        actions={
          <Link href="/liabilities" className="btn">
            All loans & cards
          </Link>
        }
      />
      <MetricStrip className="mt-4">
        <Metric label="Outstanding" value={<Money value={s.outstanding} />} sub={<>of <Money value={loan.principal} /> borrowed</>} size="lg" />
        <Metric label="EMI" value={<Money value={loan.emi} />} sub={`on the ${loan.emiDay}th from ${ledgerAccountShort(loan.debitAccountId)}`} />
        <Metric label="Installments" value={`${s.paidCount} / ${s.paidCount + s.remainingCount}`} sub={`${durationLabel(s.remainingCount)} left · ends ${formatDate(s.endDate, "MMM yyyy")}`} />
        <Metric label="Interest" value={<Money value={s.interestPaid} compact="pref" />} sub={<>paid so far · <Money value={s.interestRemaining} compact /> to come</>} />
      </MetricStrip>

      <div className="grid gap-px border-b border-rule bg-rule lg:grid-cols-12 [&>*]:bg-paper">
        <Section className="lg:col-span-8" title="Principal and interest by year" meta="each EMI splits between the two" bodyClassName="px-4 pb-5 md:px-6">
          <Columns
            label={`${loan.name} principal and interest repaid per calendar year`}
            height={150}
            data={[...years.entries()].map(([y, v]) => ({
              label: years.size > 12 ? `’${y.slice(2)}` : y,
              title: `${y}${y === "2026" ? " (this year)" : y > "2026" ? " (scheduled)" : ""}`,
              values: v,
              highlight: y === "2026",
            }))}
            series={[
              { key: "principal", label: "Principal", color: "var(--c1)", stack: "emi" },
              { key: "interest", label: "Interest", color: "var(--c2)", stack: "emi" },
            ]}
          />
        </Section>
        <Section className="lg:col-span-4" title="Repayment progress" bodyClassName="px-4 pb-5 md:px-5">
          <Progress value={s.progress} height={8} />
          <div className="mt-1.5 flex justify-between text-xs text-ink-3">
            <span>{Math.round(s.progress * 100)}% of principal repaid</span>
            <span>
              <Money value={s.principalRepaid} compact />
            </span>
          </div>
          <Facts
            className="mt-4"
            items={[
              ["Next EMI", s.next ? `${formatDate(s.next.date)} (${relativeDays(s.next.date, AS_OF)})` : "Closed"],
              ["Rate type", loan.rateType],
              ["Paid from", ledgerAccountShort(loan.debitAccountId)],
              ["Financed", asset ? asset.name : "—"],
            ]}
          />
          {loan.note && <p className="mt-3 text-xs text-ink-3">{loan.note}</p>}
          {asset && (
            <button type="button" className="btn btn-sm mt-4" onClick={() => inspect({ kind: "asset", id: asset.id })}>
              Inspect {asset.name.split(",")[0].toLowerCase()}
            </button>
          )}
        </Section>
      </div>

      <Section
        title="Repayment schedule"
        meta={full ? `all ${rows.length} installments` : "3 paid, next 12 due"}
        actions={
          <button type="button" className="btn btn-sm" onClick={() => setFull((f) => !f)}>
            {full ? "Show around today" : `Show all ${rows.length}`}
          </button>
        }
      >
        <TableWrap className={cx(full && "max-h-[70vh] overflow-y-auto")}>
          <table className="tbl min-w-[720px]">
            <thead>
              <tr>
                <th className="w-[60px]">No.</th>
                <th className="w-[130px]">Date</th>
                <th className="r">EMI</th>
                <th className="r">Principal</th>
                <th className="r">Interest</th>
                <th className="r">Balance after</th>
                <th className="w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody className="num">
              {visible.map((r, i) => {
                const paid = r.date <= AS_OF;
                const isNext = rows.indexOf(r) === nextIdx;
                return (
                  <tr key={r.n} className={cx(isNext && "bg-pen-wash")}>
                    <td className="text-ink-3">{r.n}</td>
                    <td>
                      <DateMark date={r.date} tone={paid ? "muted" : isNext ? "due" : "default"} /> <span className="text-xs text-ink-3">{r.date.slice(0, 4)}</span>
                    </td>
                    <td className={cx("r", paid && "text-ink-3")}>
                      <Money value={r.emi} />
                    </td>
                    <td className={cx("r", paid && "text-ink-3")}>
                      <Money value={r.principal} />
                    </td>
                    <td className={cx("r", paid && "text-ink-3")}>
                      <Money value={r.interest} />
                    </td>
                    <td className="r font-medium">
                      <Money value={r.balance} />
                    </td>
                    <td>{paid ? <OccurrenceTag status="paid" paidOn={r.date} /> : isNext ? <Tag tone="red">Next</Tag> : <span className="text-xs text-ink-3">{i === visible.length - 1 && !full ? "…" : "Scheduled"}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <p className="px-4 py-3 text-xs text-ink-3 md:px-6">Schedule assumes today&apos;s rate holds{loan.rateType === "Floating" ? "; a repo-rate change resets it" : ""}. Demonstration figures.</p>
      </Section>

      {emiTxns.length > 0 && (
        <Section title="EMIs in your ledger" className="border-t border-rule" bodyClassName="pb-3">
          <ul>
            {emiTxns.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => inspect({ kind: "transaction", id: t.id })} className="flex w-full items-center gap-3 border-t border-rule px-4 py-1.5 text-left first:border-t-0 hover:bg-paper-2 md:px-6">
                  <DateMark date={t.date} className="w-[52px]" />
                  <span className="flex-1 truncate text-sm">{t.description}</span>
                  <span className="text-xs text-ink-3">{ledgerAccountShort(t.accountId)}</span>
                  <Money value={t.amount} className="num w-24 text-right text-sm" />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/* ───────────── Card detail ───────────── */

export function CardDetail({ id }: { id: string }) {
  const { txns, paidOccurrences } = useLedger();
  const { inspect } = useUI();
  const pay = usePayOccurrence();
  const s = cardStatus(id, txns);
  const card = s.card;
  const last = s.lastStatement;
  const cycle = accountLedger(id, txns).filter((r) => r.txn.date > (last?.date ?? "0000") && r.txn.accountId === id);
  const occ = OCCURRENCES.find((o) => o.commitmentId === cardCommitment(id) && o.date === last?.due);
  const eff = occ ? effectiveStatus(occ, paidOccurrences) : undefined;

  return (
    <div>
      <PageHeader
        title={
          <span>
            {card.name} <span className="text-base font-normal text-ink-3">••{card.mask}</span>
          </span>
        }
        meta={`${card.institution} · ${card.network} · statement on the ${card.statementDay}${card.statementDay === 1 ? "st" : "th"}, due on the ${card.dueDay}th`}
        actions={
          <>
            <Link href="/liabilities" className="btn">
              All loans & cards
            </Link>
            <Link href={`/transactions?account=${id}&period=all`} className="btn">
              Open in ledger
            </Link>
          </>
        }
      />
      <MetricStrip className="mt-4">
        <Metric label="Outstanding" value={<Money value={s.outstanding} />} sub="Statement plus unbilled" size="lg" />
        <Metric
          label={`Statement of ${last ? formatDate(last.date, "d MMM") : "—"}`}
          value={<Money value={last?.amount ?? 0} className={cx(eff?.status === "paid" && "struck")} />}
          sub={eff ? <span className="inline-flex items-center gap-2">due {formatDate(last!.due, "d MMM")} <OccurrenceTag status={eff.status} paidOn={eff.paidOn} /></span> : undefined}
        />
        <Metric label="Unbilled" value={<Money value={s.unbilled} />} sub={`${cycle.length} spends since ${last ? formatDate(last.date, "d MMM") : "—"}`} />
        <Metric label="Available credit" value={<Money value={s.available} />} sub={<><Pct value={s.utilization * 100} decimals={0} /> of <Money value={card.limit} compact /> used</>} />
      </MetricStrip>
      {occ && eff && eff.status !== "paid" && (
        <div className="flex flex-wrap items-center gap-3 border-b border-rule bg-red-wash/60 px-4 py-3 text-sm md:px-6">
          <span className="font-semibold text-red">
            <Money value={last!.amount} /> due {formatDate(last!.due, "EEE, d MMM")} · {relativeDays(last!.due, AS_OF)}
          </span>
          <span className="text-ink-2">Autopay is off for this card. Paying the full statement avoids interest of about 3.6% a month.</span>
          <button type="button" className="btn btn-primary btn-sm ml-auto" onClick={() => pay(occ)}>
            Mark paid from {ledgerAccountShort(getCommitment(occ.commitmentId)!.payFromId)}
          </button>
        </div>
      )}
      <div className="grid gap-px border-b border-rule bg-rule lg:grid-cols-12 [&>*]:bg-paper">
        <Section className="lg:col-span-7" title="Current cycle" meta={`since ${last ? formatDate(last.date, "d MMM") : ""} · billed on ${card.statementDay}${card.statementDay === 1 ? "st" : "th"} Dec`} bodyClassName="pb-3">
          <ul>
            {cycle.map((r) => (
              <li key={r.txn.id}>
                <button type="button" onClick={() => inspect({ kind: "transaction", id: r.txn.id })} className="flex w-full items-center gap-3 border-t border-rule px-4 py-1.5 text-left first:border-t-0 hover:bg-paper-2 md:px-5">
                  <DateMark date={r.txn.date} className="w-[52px]" />
                  <span className="flex-1 truncate text-sm">{r.txn.description}</span>
                  <Money value={r.amount} tone="flow" className="num text-sm" />
                </button>
              </li>
            ))}
            {!cycle.length && <li className="px-5 py-4 text-sm text-ink-3">No spends since the last statement.</li>}
          </ul>
        </Section>
        <Section className="lg:col-span-5" title="Statements" bodyClassName="pb-3">
          <table className="w-full text-sm">
            <tbody className="num">
              {[...s.statements].reverse().map((st) => (
                <tr key={st.date} className="border-t border-rule first:border-t-0">
                  <td className="py-1.5 pl-4 md:pl-5">{formatDate(st.date, "d MMM yyyy")}</td>
                  <td className="py-1.5 text-right">
                    <Money value={st.amount} className={cx(st.paidOn && "text-ink-3")} />
                  </td>
                  <td className="py-1.5 pr-4 text-right md:pr-5">
                    {st.paidOn ? (
                      <OccurrenceTag status="paid" paidOn={st.paidOn} />
                    ) : eff?.status === "paid" ? (
                      <OccurrenceTag status="paid" paidOn={eff.paidOn} />
                    ) : (
                      <OccurrenceTag status="due" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 pt-2 text-xs text-ink-3 md:px-5">The first statement includes April spends carried in from before the data window.</p>
        </Section>
      </div>
    </div>
  );
}
