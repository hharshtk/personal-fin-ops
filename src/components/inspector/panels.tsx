"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Lock, PenLine, Pencil, Repeat2, Trash2 } from "lucide-react";
import type { EntityRef, Transaction } from "@/lib/types";
import {
  AS_OF,
  accountLedger,
  amountFor,
  budgetFor,
  CATEGORIES,
  cardStatus,
  cardBillPayments,
  entityHref,
  getAccount,
  getAsset,
  getCard,
  getCategory,
  getCommitment,
  getGoal,
  getHolding,
  getLoan,
  getPolicy,
  goalProgress,
  HOLDINGS,
  ledgerAccountName,
  ledgerAccountShort,
  loanSchedule,
  loanStatus,
  LOANS,
  OCCURRENCES,
  portfolioSummary,
  remainingBillAmount,
  SIPS,
  entityName,
  ASSET_CLASSES,
} from "@/lib/data";
import { diffDays, durationLabel, formatDate, formatMonth, monthOf, monthsBetween, relativeDays } from "@/lib/format";
import { useLedger, useUI } from "@/components/workspace/state";
import { usePayOccurrence } from "@/components/workspace/actions";
import { effectiveStatus } from "@/lib/payments";
import { Money, Pct } from "@/components/ui/money";
import { BudgetMeter, DateMark, Facts, OccurrenceTag, Progress, Tag } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";

/* ───────────── Shared pieces ───────────── */

function Head({ eyebrow, title, figure, sub }: { eyebrow?: ReactNode; title: ReactNode; figure?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-5 pt-4 pb-4">
      {eyebrow && <div className="mb-1 text-xs text-ink-3">{eyebrow}</div>}
      <h2 className="text-lg leading-snug font-semibold text-ink">{title}</h2>
      {figure && <div className="figure mt-2 text-3xl text-ink">{figure}</div>}
      {sub && <div className="mt-1.5 text-sm text-ink-2">{sub}</div>}
    </div>
  );
}

function Block({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-t border-rule px-5 py-4">
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function RefLink({ target, children }: { target: EntityRef; children: ReactNode }) {
  const { inspect } = useUI();
  return (
    <button type="button" onClick={() => inspect(target, { push: true })} className="text-left text-pen hover:underline">
      {children}
    </button>
  );
}

function TxnRows({ rows, accountId, showBalance }: { rows: Transaction[]; accountId?: string; showBalance?: Map<string, number> }) {
  const { inspect } = useUI();
  if (!rows.length) return <p className="text-sm text-ink-3">No transactions in the data window.</p>;
  return (
    <ul className="-mx-2">
      {rows.map((t) => {
        const amt = accountId ? amountFor(t, accountId) : t.amount;
        return (
          <li key={t.id}>
            <button type="button" onClick={() => inspect({ kind: "transaction", id: t.id }, { push: true })} className="flex w-full items-center gap-3 rounded-[3px] px-2 py-1.5 text-left hover:bg-paper-2">
              <DateMark date={t.date} className="w-[52px] shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.description}</span>
              <span className="text-right">
                <Money value={amt} tone="flow" className="num block text-sm" />
                {showBalance?.has(t.id) && <Money value={showBalance.get(t.id)!} className="num block text-xs text-ink-3" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function OpenLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn btn-sm">
      {children}
    </Link>
  );
}

/* ───────────── Transaction ───────────── */

const TYPE_LABEL: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer between your accounts",
  investment: "Investment",
  emi: "Loan repayment",
  card_payment: "Card bill payment",
  refund: "Refund",
  interest: "Interest",
  dividend: "Dividend",
};

export function TransactionInspector({ id }: { id: string }) {
  const { txns, updateTxn, deleteTxn, restoreTxn } = useLedger();
  const { inspect, closeInspector, toast } = useUI();
  const t = txns.find((x) => x.id === id);
  if (!t) return <Head title="Transaction removed" sub="This transaction was deleted in this session." />;
  const manual = t.source === "manual";
  const similar = txns.filter((x) => x.description === t.description && x.id !== t.id).slice(0, 4);
  const spendCats = CATEGORIES.filter((c) => c.group === "essentials" || c.group === "lifestyle");

  return (
    <div>
      <Head
        eyebrow={<span className="flex items-center gap-2">{formatDate(t.date, "EEE, d MMM")} {formatDate(t.date, "MMM yyyy").slice(4)}{manual && <Tag tone="pen"><PenLine size={11} aria-hidden />Added by you</Tag>}</span>}
        title={t.description}
        figure={<Money value={t.amount} tone="flow" decimals={2} />}
        sub={TYPE_LABEL[t.type]}
      />
      <Block>
        <Facts
          items={[
            ["Account", <RefLink key="a" target={{ kind: getCard(t.accountId) ? "card" : "account", id: t.accountId }}>{ledgerAccountName(t.accountId)}</RefLink>],
            ["Method", t.method],
            ...(t.counterpartyId
              ? ([["To", <RefLink key="c" target={{ kind: getCard(t.counterpartyId) ? "card" : "account", id: t.counterpartyId }}>{ledgerAccountName(t.counterpartyId)}</RefLink>]] as [ReactNode, ReactNode][])
              : []),
            ...(t.link ? ([["Linked to", <RefLink key="l" target={t.link}>{entityName(t.link)}</RefLink>]] as [ReactNode, ReactNode][]) : []),
            ["Status", t.status === "cleared" ? "Cleared" : "Pending"],
            ["Reference", <span key="r" className="num text-ink-2">{t.id.toUpperCase()}</span>],
          ]}
        />
      </Block>
      <Block title="Category">
        {t.type === "expense" || t.type === "refund" ? (
          <select className="select" value={t.categoryId} onChange={(e) => updateTxn(t.id, { categoryId: e.target.value })} aria-label="Category">
            {spendCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-ink">{getCategory(t.categoryId).name}</p>
        )}
        <label className="field-label mt-3" htmlFor={`note-${t.id}`}>
          Note
        </label>
        <textarea
          id={`note-${t.id}`}
          className="input min-h-16 resize-y"
          defaultValue={t.note ?? ""}
          placeholder="Add a note for yourself"
          onBlur={(e) => e.target.value !== (t.note ?? "") && updateTxn(t.id, { note: e.target.value })}
        />
        {!manual && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-3">
            <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
            Amount, date and account come from the bank statement. You can recategorise and annotate it.
          </p>
        )}
      </Block>
      {manual && (
        <Block>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={() => inspect({ kind: "edit-transaction", id: t.id })}>
              <Pencil size={13} aria-hidden /> Edit
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                deleteTxn(t.id);
                closeInspector();
                toast({ message: "Transaction deleted", action: { label: "Undo", run: () => restoreTxn(t) } });
              }}
            >
              <Trash2 size={13} aria-hidden /> Delete
            </button>
          </div>
        </Block>
      )}
      {similar.length > 0 && (
        <Block
          title={`Also from ${t.description.split(" · ")[0]}`}
          action={
            <Link href={`/transactions?q=${encodeURIComponent(t.description.split(" · ")[0])}&period=all`} className="text-xs font-medium text-pen hover:underline">
              See all
            </Link>
          }
        >
          <TxnRows rows={similar} />
        </Block>
      )}
    </div>
  );
}

/* ───────────── Cash account / deposit ───────────── */

export function AccountInspector({ id }: { id: string }) {
  const { txns } = useLedger();
  const a = getAccount(id);
  if (!a) return <Head title="Account not found" />;
  const ledger = accountLedger(id, txns);
  const balance = ledger[0]?.balance ?? a.balance;
  const recent = ledger.slice(0, 6);
  const balances = new Map(recent.map((r) => [r.txn.id, r.balance]));
  const deposit = a.kind === "fd" || a.kind === "rd";
  const goal = a.goalId ? getGoal(a.goalId) : undefined;

  return (
    <div>
      <Head eyebrow={`${a.institution}${a.mask ? ` · ••${a.mask}` : ""}`} title={a.name} figure={<Money value={deposit ? a.balance : balance} />} sub={a.role} />
      <Block>
        <Facts
          items={
            deposit
              ? [
                  ["Principal", <Money key="p" value={a.principal!} />],
                  ["Rate", `${a.interestRate}% p.a.`],
                  ["Opened", formatDate(a.openedOn)],
                  ["Matures", <span key="m">{formatDate(a.maturityDate!)} <span className="text-ink-3">({relativeDays(a.maturityDate!, AS_OF)})</span></span>],
                  ["Maturity value", <Money key="mv" value={a.maturityAmount!} />],
                  ...(a.kind === "rd"
                    ? ([["Installments", `${a.installmentsPaid} of ${a.installmentsTotal} · ₹${a.installment!.toLocaleString("en-IN")}/mo`]] as [ReactNode, ReactNode][])
                    : []),
                ]
              : [
                  ["Type", a.kind === "cash" ? "Cash" : "Savings account"],
                  ["Interest", a.interestRate ? `${a.interestRate}% p.a.` : "None"],
                  ["Opened", formatDate(a.openedOn)],
                  ["Transactions", `${ledger.length} since May`],
                ]
          }
        />
        {a.kind === "rd" && <Progress value={a.installmentsPaid! / a.installmentsTotal!} className="mt-4" />}
        {goal && (
          <p className="mt-4 text-sm text-ink-2">
            Earmarked for <RefLink target={{ kind: "goal", id: goal.id }}>{goal.name}</RefLink>
          </p>
        )}
      </Block>
      {!deposit && (
        <Block title="Recent activity" action={<span className="text-xs text-ink-3">Amount · balance after</span>}>
          <TxnRows rows={recent.map((r) => r.txn)} accountId={id} showBalance={balances} />
        </Block>
      )}
      <Block>
        <div className="flex flex-wrap gap-2">
          <OpenLink href={`/accounts/${id}`}>Open account</OpenLink>
          {!deposit && <OpenLink href={`/transactions?account=${id}&period=all`}>All transactions</OpenLink>}
        </div>
      </Block>
    </div>
  );
}

/* ───────────── Credit card ───────────── */

export function CardInspector({ id }: { id: string }) {
  const { txns, paidOccurrences } = useLedger();
  const pay = usePayOccurrence();
  const card = getCard(id);
  if (!card) return <Head title="Card not found" />;
  const st = cardStatus(id, txns);
  const occ = OCCURRENCES.find((o) => o.commitmentId === st.commitment?.id && o.date === st.lastStatement?.due);
  const eff = occ ? effectiveStatus(occ, paidOccurrences) : undefined;
  const ledger = accountLedger(id, txns).slice(0, 6);

  return (
    <div>
      <Head eyebrow={`${card.institution} · ${card.network} ••${card.mask}`} title={card.name} figure={<Money value={st.outstanding} />} sub="Outstanding, including unbilled spends" />
      <Block>
        {st.lastStatement && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[3px] bg-paper-2 px-3 py-2.5">
            <div>
              <div className="label">Statement of {formatDate(st.lastStatement.date, "d MMM")}</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <Money value={st.lastStatement.remaining} className="figure text-xl" />
                <span className="text-xs text-ink-3">due {formatDate(st.lastStatement.due, "d MMM")}</span>
              </div>
            </div>
            {eff && <OccurrenceTag status={eff.status} paidOn={eff.paidOn} />}
          </div>
        )}
        <Facts
          items={[
            ["Unbilled", <Money key="u" value={st.unbilled} />],
            ["Credit limit", <Money key="l" value={card.limit} />],
            ["Available", <Money key="a" value={st.available} />],
            ["Rewards", card.rewardPoints ? `${card.rewardPoints.toLocaleString("en-IN")} points` : "Amazon Pay cashback"],
          ]}
        />
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-ink-3">
            <span>Utilisation</span>
            <Pct value={st.utilization * 100} />
          </div>
          <BudgetMeter ratio={st.utilization / 0.3} alertAt={0.8} />
          <p className="mt-1.5 text-xs text-ink-3">Marker at 30% of the limit, the level lenders read as healthy.</p>
        </div>
        {occ && eff && eff.status !== "paid" && (
          <button type="button" className="btn btn-primary btn-sm mt-4" onClick={() => pay(occ)}>
            Mark statement paid from {ledgerAccountShort(getCommitment(occ.commitmentId)!.payFromId)}
          </button>
        )}
      </Block>
      <Block title="Recent card activity">
        <TxnRows rows={ledger.map((r) => r.txn)} accountId={id} />
      </Block>
      <Block>
        <OpenLink href={entityHref({ kind: "card", id })}>Open credit card dashboard</OpenLink>
      </Block>
    </div>
  );
}

/* ───────────── Loan ───────────── */

export function LoanInspector({ id }: { id: string }) {
  const loan = getLoan(id);
  if (!loan) return <Head title="Loan not found" />;
  const s = loanStatus(id);
  const upcoming = loanSchedule(id).filter((r) => r.date > AS_OF).slice(0, 3);
  const asset = loan.assetId ? getAsset(loan.assetId) : undefined;

  return (
    <div>
      <Head eyebrow={`${loan.lender}${loan.mask ? ` · ${loan.mask}` : ""}`} title={loan.name} figure={<Money value={s.outstanding} />} sub={`Outstanding of ${formatMoneyPlain(loan.principal)} borrowed`} />
      <Block>
        <div className="mb-1.5 flex justify-between text-xs text-ink-3">
          <span>{Math.round(s.progress * 100)}% of principal repaid</span>
          <span>
            {s.paidCount} of {s.paidCount + s.remainingCount} EMIs
          </span>
        </div>
        <Progress value={s.progress} />
        <Facts
          className="mt-4"
          items={[
            ["EMI", <Money key="e" value={loan.emi} />],
            ["Rate", loan.rateType === "Interest-free" ? "Interest-free" : `${loan.rate}% ${loan.rateType.toLowerCase()}`],
            ["Next EMI", s.next ? formatDate(s.next.date) : "Closed"],
            ["Ends", `${formatDate(s.endDate, "MMM yyyy")} · ${durationLabel(s.remainingCount)} left`],
            ["Interest paid", <Money key="ip" value={s.interestPaid} />],
            ["Interest to come", <Money key="ir" value={s.interestRemaining} />],
            ["Paid from", <RefLink key="d" target={{ kind: "account", id: loan.debitAccountId }}>{ledgerAccountShort(loan.debitAccountId)}</RefLink>],
            ...(asset ? ([["Financed", <RefLink key="as" target={{ kind: "asset", id: asset.id }}>{asset.name}</RefLink>]] as [ReactNode, ReactNode][]) : []),
          ]}
        />
        {loan.note && <p className="mt-3 text-xs text-ink-3">{loan.note}</p>}
      </Block>
      <Block title="Next installments">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-3">
              <th className="pb-1 text-left font-medium">Date</th>
              <th className="pb-1 text-right font-medium">Principal</th>
              <th className="pb-1 text-right font-medium">Interest</th>
              <th className="pb-1 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="num">
            {upcoming.map((r) => (
              <tr key={r.n} className="border-t border-rule">
                <td className="py-1.5">
                  <DateMark date={r.date} tone={diffDays(r.date, AS_OF) <= 14 ? "due" : "default"} />
                </td>
                <td className="py-1.5 text-right">
                  <Money value={r.principal} />
                </td>
                <td className="py-1.5 text-right text-ink-2">
                  <Money value={r.interest} />
                </td>
                <td className="py-1.5 text-right">
                  <Money value={r.balance} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
      <Block>
        <OpenLink href={`/liabilities/${id}`}>Open repayment schedule</OpenLink>
      </Block>
    </div>
  );
}

function formatMoneyPlain(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/* ───────────── Holding ───────────── */

export function HoldingInspector({ id }: { id: string }) {
  const { txns } = useLedger();
  const h = getHolding(id);
  if (!h) return <Head title="Holding not found" />;
  const gain = h.current - h.invested;
  const total = portfolioSummary().current;
  const sip = h.sipId ? SIPS.find((s) => s.id === h.sipId) : undefined;
  const linked = txns.filter((t) => t.link?.kind === "holding" && t.link.id === id).slice(0, 6);
  const cls = ASSET_CLASSES.find((c) => c.id === h.assetClass)!;

  return (
    <div>
      <Head
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ background: `var(--c${cls.slot})` }} aria-hidden />
            {cls.name} · {h.type}
          </span>
        }
        title={h.name}
        figure={<Money value={h.current} />}
        sub={
          <span className="flex flex-wrap items-center gap-x-3">
            <Money value={gain} sign="always" tone="gain" />
            <Pct value={(gain / h.invested) * 100} sign tone="gain" />
            {h.xirr !== undefined && <span className="text-ink-3">XIRR {h.xirr.toFixed(1)}%</span>}
          </span>
        }
      />
      <Block>
        <Facts
          items={[
            ["Held at", h.platform],
            ["Identifier", h.symbol ?? "—"],
            ...(h.units !== undefined
              ? ([
                  ["Units", h.units.toLocaleString("en-IN", { maximumFractionDigits: 3 })],
                  ["Average cost", <Money key="ac" value={h.avgCost!} decimals={2} />],
                  ["Price (as of)", <Money key="pr" value={h.price!} decimals={2} />],
                ] as [ReactNode, ReactNode][])
              : []),
            ["Invested", <Money key="iv" value={h.invested} />],
            ["Portfolio weight", <Pct key="w" value={(h.current / total) * 100} />],
            ...(h.dayChangePct !== undefined ? ([["Last session", <Pct key="d" value={h.dayChangePct} sign tone="gain" />]] as [ReactNode, ReactNode][]) : []),
          ]}
        />
        {h.lockIn && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-3">
            <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
            {h.lockIn}
          </p>
        )}
        {h.note && <p className="mt-2 text-xs text-ink-3">{h.note}</p>}
      </Block>
      {(sip || h.goalId) && (
        <Block title="Plan">
          {sip && (
            <p className="flex items-center gap-1.5 text-sm text-ink">
              <Repeat2 size={14} className="text-ink-3" aria-hidden />
              {sip.kind} of <Money value={sip.amount} className="font-semibold" /> on the {ordinal(sip.day)}, from{" "}
              <RefLink target={{ kind: "account", id: sip.debitAccountId }}>{ledgerAccountShort(sip.debitAccountId)}</RefLink>
            </p>
          )}
          {h.goalId && (
            <p className="mt-2 text-sm text-ink-2">
              Counts towards <RefLink target={{ kind: "goal", id: h.goalId }}>{getGoal(h.goalId)?.name}</RefLink>
            </p>
          )}
        </Block>
      )}
      {linked.length > 0 && (
        <Block title="Contributions and payouts">
          <TxnRows rows={linked} />
        </Block>
      )}
      <Block>
        <OpenLink href={`/investments?class=${h.assetClass}&h=${h.id}`}>Show in portfolio</OpenLink>
      </Block>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ───────────── Physical asset ───────────── */

export function AssetInspector({ id }: { id: string }) {
  const a = getAsset(id);
  if (!a) return <Head title="Asset not found" />;
  const loan = a.loanId ? loanStatus(a.loanId) : undefined;
  const policy = a.policyId ? getPolicy(a.policyId) : undefined;
  const familyLoan = LOANS.filter((l) => l.assetId === id && l.id !== a.loanId).map((l) => loanStatus(l.id));
  const owed = (loan?.outstanding ?? 0) + familyLoan.reduce((s, l) => s + l.outstanding, 0);

  return (
    <div>
      <Head eyebrow={a.kind === "real_estate" ? "Real estate · illiquid" : a.kind === "vehicle" ? "Vehicle · depreciating" : "Physical gold"} title={a.name} figure={<Money value={a.currentValue} />} sub={a.detail} />
      <Block>
        <Facts
          items={[
            ["Bought", formatDate(a.acquiredOn, "MMM yyyy")],
            ["Cost", <Money key="c" value={a.cost} />],
            ["Change", <Money key="g" value={a.currentValue - a.cost} sign="always" tone="gain" />],
            ["Your equity", <Money key="e" value={a.currentValue - owed} />],
          ]}
        />
        <p className="mt-3 text-xs text-ink-3">{a.valuationNote}. Estimates only; no market data is fetched.</p>
      </Block>
      {(loan || familyLoan.length > 0 || policy) && (
        <Block title="Linked">
          <ul className="space-y-1.5 text-sm">
            {loan && (
              <li className="flex justify-between gap-3">
                <RefLink target={{ kind: "loan", id: loan.loan.id }}>{loan.loan.name} · {loan.loan.lender}</RefLink>
                <Money value={-loan.outstanding} className="num text-ink-2" />
              </li>
            )}
            {familyLoan.map((l) => (
              <li key={l.loan.id} className="flex justify-between gap-3">
                <RefLink target={{ kind: "loan", id: l.loan.id }}>{l.loan.name}</RefLink>
                <Money value={-l.outstanding} className="num text-ink-2" />
              </li>
            ))}
            {policy && (
              <li className="flex justify-between gap-3">
                <RefLink target={{ kind: "policy", id: policy.id }}>{policy.insurer} {policy.name}</RefLink>
                <span className="text-ink-3">renews {formatDate(policy.renewsOn, "d MMM")}</span>
              </li>
            )}
          </ul>
        </Block>
      )}
    </div>
  );
}

/* ───────────── Policy ───────────── */

export function PolicyInspector({ id }: { id: string }) {
  const { paidOccurrences } = useLedger();
  const pay = usePayOccurrence();
  const p = getPolicy(id);
  if (!p) return <Head title="Policy not found" />;
  const occ = OCCURRENCES.find((o) => getCommitment(o.commitmentId)?.link?.id === id);
  const eff = occ ? effectiveStatus(occ, paidOccurrences) : undefined;
  const days = diffDays(p.renewsOn, AS_OF);

  return (
    <div>
      <Head eyebrow={`${p.insurer} · ${p.policyNo}`} title={p.name} figure={<Money value={p.cover} />} sub={p.kind === "vehicle" ? "Insured declared value" : "Sum assured"} />
      <Block>
        <Facts
          items={[
            ["Premium", p.premium ? <Money key="p" value={p.premium} /> : "Paid by employer"],
            ["Renews", <span key="r" className={cx(days <= 30 && "font-semibold text-red")}>{formatDate(p.renewsOn)} ({relativeDays(p.renewsOn, AS_OF)})</span>],
            ["Insured", p.insured],
            ["Nominee", p.nominee ?? "—"],
            ["Policy since", formatDate(p.startedOn, "MMM yyyy")],
            ["Pays from", p.payFromId ? ledgerAccountShort(p.payFromId) : "—"],
          ]}
        />
        {p.assetId && (
          <p className="mt-3 text-sm text-ink-2">
            Covers <RefLink target={{ kind: "asset", id: p.assetId }}>{getAsset(p.assetId)?.name}</RefLink>
          </p>
        )}
        {occ && eff && eff.status !== "paid" && (
          <button type="button" className="btn btn-sm mt-4" onClick={() => pay(occ)}>
            Mark renewal paid
          </button>
        )}
        {eff?.status === "paid" && (
          <div className="mt-4">
            <OccurrenceTag status="paid" paidOn={eff.paidOn} />
          </div>
        )}
      </Block>
      <Block title="What it covers">
        <ul className="list-disc space-y-1 pl-4 text-sm text-ink-2 marker:text-ink-3">
          {p.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Block>
    </div>
  );
}

/* ───────────── Goal ───────────── */

export function GoalInspector({ id }: { id: string }) {
  const g = getGoal(id);
  if (!g) return <Head title="Goal not found" />;
  const p = goalProgress(id);
  const monthsLeft = monthsBetween(AS_OF, g.targetDate);
  return (
    <div>
      <Head
        eyebrow={`Target ${formatDate(g.targetDate, "MMM yyyy")} · ${durationLabel(Math.max(0, monthsLeft))} away`}
        title={g.name}
        figure={
          <span>
            <Money value={p.saved} compact="pref" /> <span className="text-xl text-ink-3">of <Money value={g.target} compact="pref" /></span>
          </span>
        }
      />
      <Block>
        <div className="mb-1.5 flex justify-between text-xs text-ink-3">
          <span>{Math.round(p.ratio * 100)}% funded</span>
          <GoalStatus status={g.status} />
        </div>
        <Progress value={p.ratio} tone={g.status === "behind" ? "amber" : "ink"} />
        <Facts
          className="mt-4"
          items={[
            ["Still needed", <Money key="g" value={Math.max(0, p.gap)} />],
            ["Monthly plan", <Money key="m" value={g.monthlyPlan} />],
          ]}
        />
        <p className="mt-3 text-sm text-ink-2">{g.note}</p>
      </Block>
      <Block title="Money set aside">
        <ul className="space-y-2">
          {g.allocations.map((a) => {
            const isHolding = a.ref.kind === "holding";
            const label = isHolding ? getHolding(a.ref.id)?.name : ledgerAccountName(a.ref.id, { withMask: false });
            return (
              <li key={a.ref.id} className="flex items-baseline justify-between gap-3 text-sm">
                <RefLink target={a.ref}>{label}</RefLink>
                <Money value={a.amount} className="num shrink-0 text-ink" />
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink-3">Each account or holding counts towards one goal only, so nothing is counted twice.</p>
      </Block>
      <Block>
        <OpenLink href="/goals">Open goals</OpenLink>
      </Block>
    </div>
  );
}

export function GoalStatus({ status }: { status: "on_track" | "behind" | "ahead" }) {
  if (status === "behind") return <Tag tone="amber">Behind plan</Tag>;
  if (status === "ahead") return <Tag tone="green">Ahead of plan</Tag>;
  return <Tag>On track</Tag>;
}

/* ───────────── Bill / commitment occurrence ───────────── */

export function OccurrenceInspector({ id }: { id: string }) {
  const { paidOccurrences, txns } = useLedger();
  const pay = usePayOccurrence();
  const occ = OCCURRENCES.find((o) => o.id === id) ?? OCCURRENCES.find((o) => o.commitmentId === id && o.status !== "paid");
  if (!occ) return <Head title="Bill not found" />;
  const c = getCommitment(occ.commitmentId)!;
  const eff = effectiveStatus(occ, paidOccurrences);
  const history = OCCURRENCES.filter((o) => o.commitmentId === c.id && o.date < occ.date).slice(-4).reverse();
  const paidTxn = c.kind === "card" && c.link
    ? cardBillPayments(occ.id, c.link.id, txns)[0]
    : occ.txnId ? txns.find((t) => t.id === occ.txnId) : txns.find((t) => t.source === "manual" && t.occurrenceId === occ.id);

  return (
    <div>
      <Head
        eyebrow={`${c.cadence} · ${c.autopay ? "Autopay" : "Manual payment"}`}
        title={c.name}
        figure={<Money value={eff.status === "paid" ? occ.amount : remainingBillAmount(occ, txns)} className={cx(eff.status === "paid" && "struck")} />}
        sub={
          <span className="flex items-center gap-3">
            <span>
              {eff.status === "paid" ? "Was due" : "Due"} {formatDate(occ.date, "EEE, d MMM")}
            </span>
            <OccurrenceTag status={eff.status} paidOn={eff.paidOn} autopay={c.autopay} />
          </span>
        }
      />
      <Block>
        <Facts
          items={[
            ["Pays from", <RefLink key="p" target={{ kind: getCard(c.payFromId) ? "card" : "account", id: c.payFromId }}>{ledgerAccountShort(c.payFromId)}</RefLink>],
            ["Category", getCategory(c.categoryId).name],
            ...(c.link ? ([["For", <RefLink key="l" target={c.link}>{entityName(c.link)}</RefLink>]] as [ReactNode, ReactNode][]) : []),
            ["Amount", c.variable ? "Varies each cycle" : "Fixed"],
          ]}
        />
        {(eff.status === "due" || eff.status === "overdue") && (
          <button type="button" className="btn btn-primary btn-sm mt-4" onClick={() => pay(occ)}>
            Mark as paid from {ledgerAccountShort(c.payFromId)}
          </button>
        )}
        {eff.status === "overdue" && <p className="mt-2 text-xs text-red">{-diffDays(occ.date, AS_OF)} days late. Most billers add a late fee after 7 days.</p>}
        {paidTxn && (
          <p className="mt-3 text-sm text-ink-2">
            {eff.status === "paid" ? "Paid by" : "Last payment"} <RefLink target={{ kind: "transaction", id: paidTxn.id }}>{paidTxn.description}</RefLink> on {formatDate(paidTxn.date, "d MMM")}
          </p>
        )}
      </Block>
      {history.length > 0 && (
        <Block title="Earlier">
          <ul className="space-y-1.5">
            {history.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <DateMark date={o.date} tone="muted" />
                <Money value={o.amount} className="num flex-1 text-right text-ink-2" />
                <span className="w-24 text-right">
                  <OccurrenceTag status={o.status} paidOn={o.paidOn} autopay={c.autopay} />
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}
      <Block>
        <OpenLink href="/calendar">Open bills & calendar</OpenLink>
      </Block>
    </div>
  );
}

/* ───────────── Spending category ───────────── */

export function CategoryInspector({ id }: { id: string }) {
  const { txns } = useLedger();
  const cat = getCategory(id);
  const month = monthOf(AS_OF);
  const line = budgetFor(month, txns).find((b) => b.category.id === id);
  const rows = txns.filter((t) => t.categoryId === id && monthOf(t.date) === month);
  const byMerchant = new Map<string, number>();
  rows.forEach((t) => byMerchant.set(t.description, (byMerchant.get(t.description) ?? 0) - t.amount));
  const top = [...byMerchant.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div>
      <Head eyebrow={formatMonth(month, "MMMM yyyy")} title={cat.name} figure={line ? <Money value={line.actual} /> : undefined} sub={line ? <>of <Money value={line.budget} /> budget</> : undefined} />
      {line && (
        <Block>
          <BudgetMeter ratio={line.ratio} />
          <p className="mt-2 text-sm text-ink-2">
            {line.remaining >= 0 ? (
              <>
                <Money value={line.remaining} /> left for the rest of the month.
              </>
            ) : (
              <>
                <Money value={-line.remaining} className="font-semibold text-red" /> over budget.
              </>
            )}
          </p>
        </Block>
      )}
      <Block title="Where it went">
        <ul className="space-y-1.5 text-sm">
          {top.map(([name, amt]) => (
            <li key={name} className="flex justify-between gap-3">
              <span className="truncate">{name}</span>
              <Money value={amt} className="num" />
            </li>
          ))}
        </ul>
      </Block>
      <Block>
        <OpenLink href={`/transactions?category=${id}&period=month`}>See {rows.length} transactions</OpenLink>
      </Block>
    </div>
  );
}

export { HOLDINGS };
