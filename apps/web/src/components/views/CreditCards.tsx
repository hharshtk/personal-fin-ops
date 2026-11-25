"use client";

import Link from "next/link";
import { useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronDown, ChevronRight, CreditCard, Gift, ReceiptText, Repeat2 } from "lucide-react";
import { AS_OF, CARDS, CARD_REWARDS, DATA_START_DATE, OCCURRENCES, accountLedger, cardStatus, entityHref, getCategory, ledgerAccountShort, type LedgerRow } from "@myfinancespace/core/data";
import { addDays, formatDate, relativeDays } from "@myfinancespace/core/format";
import type { ISODate, Occurrence } from "@myfinancespace/core/types";
import { usePayOccurrence } from "@/components/workspace/actions";
import { useLedger, usePrefs, useUI } from "@/components/workspace/state";
import { Money, Pct } from "@/components/ui/money";
import { EmptyState, InspectButton, OccurrenceTag, Progress, Tag } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";

type CardStatus = ReturnType<typeof cardStatus>;
type CardStatement = CardStatus["statements"][number];
type ActivityFilter = "cycle" | "payments" | "all" | "statement";

const ACTIVITY_FILTERS = [
  { id: "cycle", label: "Unbilled" },
  { id: "payments", label: "Payments" },
  { id: "all", label: "All activity" },
] as const;

const ACTIVITY_LIMIT = 6;
const STATEMENT_LIMIT = 4;

function CardAmount({ value, ...props }: Omit<ComponentProps<typeof Money>, "decimals">) {
  return <Money {...props} value={value} decimals={Number.isInteger(value) ? undefined : 2} />;
}

function SectionTitle({ id, icon: Icon, children }: { id: string; icon: typeof CreditCard; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-base font-semibold text-ink">
      <Icon size={16} className="shrink-0 text-ink-3" aria-hidden />
      {children}
    </h2>
  );
}

function statementStatus(statement: CardStatement) {
  if (statement.remaining === 0) return "paid";
  if (statement.due < AS_OF) return "overdue";
  return "due";
}

function StatementStatus({ statement }: { statement: CardStatement }) {
  if (statement.remaining > 0 && statement.minimumRemaining === 0 && statement.due >= AS_OF) {
    return <Tag tone="pen">Minimum met</Tag>;
  }
  if (statement.remaining > 0 && statement.payments.length > 0 && statement.due >= AS_OF) {
    return <Tag tone="amber">Part paid</Tag>;
  }
  return <OccurrenceTag status={statementStatus(statement)} paidOn={statement.paidOn} />;
}

function StatementPayment({ statement, occurrence, accountId, onRecorded }: { statement: CardStatement; occurrence: Occurrence; accountId: string; onRecorded: () => void }) {
  const pay = usePayOccurrence();
  const [mode, setMode] = useState("full");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState(false);
  const amount = mode === "full" ? statement.remaining : mode === "minimum" ? statement.minimumRemaining ?? 0 : Number(custom);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rounded = Math.round(amount * 100) / 100;
    if (rounded <= 0 || rounded > statement.remaining || !pay(occurrence, rounded)) {
      setError(true);
      return;
    }
    onRecorded();
  }

  return (
    <form onSubmit={submit} className="mt-3 border-t border-rule px-0 pt-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-36">
          <span className="field-label">Payment amount</span>
          <select className="select" value={mode} onChange={(event) => { setMode(event.target.value); setError(false); }}>
            <option value="full">Remaining statement</option>
            {Boolean(statement.minimumRemaining && statement.minimumRemaining < statement.remaining) && <option value="minimum">Minimum due</option>}
            <option value="custom">Custom amount</option>
          </select>
        </label>
        {mode === "custom" && (
          <label className="block w-32">
            <span className="field-label">Amount (₹)</span>
            <input className="input" type="number" inputMode="decimal" min="0.01" max={statement.remaining} step="0.01" required value={custom}
              onChange={(event) => { setCustom(event.target.value); setError(false); }} />
          </label>
        )}
        <button type="submit" className="btn btn-primary max-sm:min-h-10" disabled={!Number.isFinite(amount) || amount <= 0}>Record <CardAmount value={Number.isFinite(amount) ? amount : 0} /></button>
      </div>
      <p className="mt-2 text-xs text-ink-3">Only record payments you’ve already made. The demo records this from {ledgerAccountShort(accountId)} on {formatDate(AS_OF, "d MMM")}.</p>
      {error && <p role="alert" className="mt-1 text-xs text-red">Enter an amount between ₹0.01 and <CardAmount value={statement.remaining} />.</p>}
    </form>
  );
}

function PaymentSummary({ status, onViewStatement }: { status: CardStatus; onViewStatement: (statement: CardStatement) => void }) {
  const { commitment, lastStatement, statements } = status;
  const statement = statements.find((item) => item.remaining > 0) ?? lastStatement;
  const occurrence = statement && OCCURRENCES.find((o) => o.commitmentId === commitment?.id && o.date === statement.due);
  const [open, setOpen] = useState(false);
  const summary = useRef<HTMLElement>(null);
  const due = !!statement?.remaining;
  const days = statement && relativeDays(statement.due, AS_OF);
  const showPayment = due && open && occurrence && commitment;

  return (
    <section ref={summary} tabIndex={-1} className="min-w-0 bg-paper px-4 py-4 md:px-6" aria-labelledby="card-payment-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle id="card-payment-title" icon={ReceiptText}>Statement payment</SectionTitle>
        {statement && <StatementStatus statement={statement} />}
      </div>
      {statement ? (
        <>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <div className="text-sm text-ink-2">Remaining statement</div>
              <CardAmount value={statement.remaining} className={cx("figure mt-0.5 block text-[42px]", due ? "text-red" : "text-ink")} />
            </div>
            <div className="pb-0.5 sm:text-right">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-3"><CalendarDays size={13} aria-hidden />Payment due date</div>
              <time className={cx("mt-0.5 block text-lg font-semibold", due ? "text-red" : "text-ink")} dateTime={statement.due}>{formatDate(statement.due, "EEE, d MMM")}</time>
              {due && <div className="text-xs text-ink-3">{days}</div>}
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-y border-rule py-3 min-[480px]:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-3">Billed {formatDate(statement.date, "d MMM")}</dt>
              <dd className="num text-sm font-semibold"><Money value={statement.amount} /></dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Minimum still due</dt>
              <dd className="num text-sm font-semibold">
                {statement.minimumRemaining === undefined ? <span className="font-normal text-ink-3">{due ? "See issuer statement" : "—"}</span> : <CardAmount value={statement.minimumRemaining} />}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Payments recorded</dt>
              <dd className="num text-sm font-semibold"><CardAmount value={statement.paid} /></dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-2 text-sm text-ink-2">
              <Repeat2 size={15} className="shrink-0 text-ink-3" aria-hidden />
              <span>{commitment?.autopay ? "Autopay on" : "Autopay off"}
                {commitment && (
                  <> <span className="text-ink-3">·</span>{" "}
                    <InspectButton className="text-pen" target={{ kind: "account", id: commitment.payFromId }}>
                      {ledgerAccountShort(commitment.payFromId)}
                    </InspectButton>
                  </>
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {due && occurrence && <button type="button" className="btn btn-primary max-sm:min-h-10" aria-expanded={open} onClick={() => setOpen(!open)}>
                {open ? "Close payment form" : "Record payment"}
              </button>}
              {!due && statement.payments.length > 0 && <PaymentLink row={statement.payments[0].id} />}
            </div>
          </div>
          {showPayment && <StatementPayment key={statement.date} statement={statement} occurrence={occurrence} accountId={commitment.payFromId}
            onRecorded={() => { setOpen(false); summary.current?.focus({ preventScroll: true }); }} />}
          {due && <p className="mt-2 text-xs text-ink-3">Interest may apply if the full statement balance is unpaid after the due date.</p>}
          {!due && statement.payments.length === 0 && <button type="button" className="btn btn-sm mt-3" onClick={() => onViewStatement(statement)}>View statement</button>}
        </>
      ) : <p className="mt-4 text-sm text-ink-3">No statement has been issued.</p>}
    </section>
  );
}

function PaymentLink({ row }: { row: string }) {
  const { inspect } = useUI();
  return <button type="button" className="btn" onClick={() => inspect({ kind: "transaction", id: row })}>View payment <ChevronRight size={14} aria-hidden /></button>;
}

function CreditSummary({ status }: { status: CardStatus }) {
  const { card, available, outstanding, unbilled, utilization, nextStatement } = status;

  return (
    <section className="min-w-0 bg-paper-2 px-4 py-4 md:px-6" aria-labelledby="card-credit-title">
      <SectionTitle id="card-credit-title" icon={CreditCard}>Credit &amp; limits</SectionTitle>
      <div className="mt-4 text-sm text-ink-2">{outstanding < 0 ? "Credit balance" : "Current outstanding"}</div>
      <CardAmount value={Math.abs(outstanding)} className="figure mt-0.5 block text-3xl" />
      <div className="mt-3.5 flex items-center justify-between gap-3 text-xs text-ink-2">
        <span>Credit used</span>
        <Pct value={Math.max(0, utilization) * 100} className="num font-semibold text-ink" />
      </div>
      <Progress className="mt-1.5" value={utilization} tone={utilization > 1 ? "red" : "ink"} />
      <dl className="mt-2.5 text-sm [&>div]:flex [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-3 [&>div]:py-1 [&_dt]:text-ink-2 [&_dd]:num [&_dd]:text-right [&_dd]:font-semibold">
        <div><dt>Available credit</dt><dd><CardAmount value={Math.max(0, available)} /></dd></div>
        <div><dt>Credit limit</dt><dd><Money value={card.limit} /></dd></div>
        <div className="mt-1.5 border-t border-rule !pt-2"><dt>Unbilled balance</dt><dd><CardAmount value={unbilled} /></dd></div>
        <div><dt>Next statement</dt><dd><time dateTime={nextStatement}>{formatDate(nextStatement)}</time></dd></div>
      </dl>
    </section>
  );
}

function CardRewards({ status }: { status: CardStatus }) {
  const { prefs } = usePrefs();
  const rewards = CARD_REWARDS[status.card.id];
  const points = new Intl.NumberFormat(prefs.numberSystem === "indian" ? "en-IN" : "en-US");
  const pointsBalance = rewards?.kind === "points" ? points.format(status.card.rewardPoints) : "";

  return (
    <section id="card-rewards" className="min-w-0 scroll-mt-12 bg-paper px-4 py-4 md:px-6" aria-labelledby="card-rewards-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle id="card-rewards-title" icon={Gift}>Rewards &amp; benefits</SectionTitle>
        {rewards && <a href={rewards.issuerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-pen hover:underline">Issuer terms <ArrowUpRight size={13} aria-hidden /></a>}
      </div>
      {!rewards ? <p className="mt-3 text-sm text-ink-3">No rewards data is available for this card.</p> : (
        <>
          {rewards.kind === "points" ? (
            <>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
                <span className="figure text-3xl">{pointsBalance}</span>
                <span className="text-sm text-ink-2">points available</span>
              </div>
              <div className="mt-2 space-y-1 text-sm text-ink-2">
                <p><span className="num font-medium text-ink">+{points.format(rewards.earnedLastStatement)}</span> points on the last statement</p>
                <p className="text-amber"><span className="num font-semibold">{points.format(rewards.expiry.points)} points</span> expire <time dateTime={rewards.expiry.date}>{formatDate(rewards.expiry.date)}</time></p>
              </div>
              <div className="mt-3.5 border-t border-rule pt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <h3 className="text-sm font-semibold text-ink">Quarterly spend milestone</h3>
                  <span className="text-xs text-ink-3">Ends {formatDate(rewards.quarter.endsOn, "d MMM")}</span>
                </div>
                <p className="mt-1 text-xs text-ink-2"><Money value={rewards.quarter.eligibleSpend} className="font-semibold text-ink" /> of <Money value={rewards.quarter.target} /> in eligible spends</p>
                <Progress className="mt-1.5" value={rewards.quarter.eligibleSpend / rewards.quarter.target} />
                <p className="mt-1.5 text-xs text-ink-3"><Money value={rewards.quarter.voucher} /> voucher when you reach the target</p>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
                <Money value={rewards.lastCredit.amount} className="figure text-3xl" />
                <span className="text-sm text-ink-2">cashback last credited</span>
              </div>
              <p className="mt-2 text-sm text-ink-2">Added to Amazon Pay balance on <time dateTime={rewards.lastCredit.date}>{formatDate(rewards.lastCredit.date, "d MMM")}</time>.</p>
              <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-2 border-t border-rule pt-3 text-sm">
                <span className="text-ink-2">Cashback credited this financial year</span>
                <Money value={rewards.creditedThisFY} className="num font-semibold" />
              </div>
            </>
          )}
          <details className="group mt-3.5 border-t border-rule">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink hover:text-pen [&::-webkit-details-marker]:hidden">
              Earn, redeem &amp; fees <ChevronDown size={15} className="text-ink-3 group-open:rotate-180" aria-hidden />
            </summary>
            <dl className="space-y-2.5 pb-2 text-sm">
              {rewards.benefits.map((benefit) => <div key={benefit.title}>
                <dt className="font-semibold text-ink">{benefit.title}</dt>
                <dd className="mt-0.5 text-ink-2">{benefit.detail}</dd>
              </div>)}
            </dl>
          </details>
        </>
      )}
    </section>
  );
}

function Activity({
  cardId, rows, filter, statement, cycleStart, onFilter,
}: {
  cardId: string;
  rows: LedgerRow[];
  filter: ActivityFilter;
  statement?: CardStatement;
  cycleStart?: ISODate;
  onFilter: (filter: ActivityFilter) => void;
}) {
  const { inspect, inspector } = useUI();
  const [showAll, setShowAll] = useState(false);
  const displayed = rows.filter(({ txn, amount }) => {
    if (filter === "payments") return amount > 0 && (txn.type === "card_payment" || txn.type === "transfer");
    if (filter === "statement" && statement) return txn.accountId === cardId && txn.date >= statement.periodStart && txn.date <= statement.date;
    if (filter === "cycle") return txn.accountId === cardId && (!cycleStart || txn.date >= cycleStart);
    return true;
  });
  const visible = showAll ? displayed : displayed.slice(0, ACTIVITY_LIMIT);

  return (
    <section className="min-w-0 bg-paper" aria-labelledby="card-activity-title">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 md:px-6">
        <SectionTitle id="card-activity-title" icon={ReceiptText}>Card activity</SectionTitle>
        <Link href={`/transactions?account=${cardId}&period=all`} className="inline-flex items-center gap-1 text-xs font-medium text-pen hover:underline">
          Open ledger <ArrowUpRight size={13} aria-hidden />
        </Link>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 px-4 md:px-6" role="group" aria-label="Filter card activity">
        {ACTIVITY_FILTERS.map((item) => (
          <button key={item.id} type="button" className={cx("btn btn-sm max-sm:min-h-9", filter === item.id && "border-pen/30 bg-pen-wash text-pen")}
            aria-pressed={filter === item.id} onClick={() => { setShowAll(false); onFilter(item.id); }}>
            {item.label}
          </button>
        ))}
        {filter === "statement" && statement && <Tag tone="pen" className="px-2">Statement · {formatDate(statement.date, "d MMM")}</Tag>}
      </div>
      <p className="mt-2 px-4 text-xs text-ink-3 md:px-6">
        {filter === "statement" && statement ? `${formatDate(statement.periodStart, "d MMM")} to ${formatDate(statement.date)}` :
          filter === "cycle" && cycleStart ? `Since ${formatDate(cycleStart, "d MMM")}` :
            filter === "payments" ? "Credits from your paying accounts" : "Purchases, refunds and payments"}
      </p>
      {filter === "statement" && statement?.periodStart === DATA_START_DATE && (
        <p className="mt-1 px-4 text-xs text-ink-3 md:px-6">The first statement also includes a balance carried in from before the demo ledger.</p>
      )}
      {visible.length ? (
        <ul className="mt-2 border-y border-rule">
          {visible.map(({ txn, amount }) => (
            <li key={txn.id} className="border-b border-rule last:border-b-0">
              <button type="button" onClick={() => inspect({ kind: "transaction", id: txn.id })}
                className={cx("grid min-h-[46px] w-full grid-cols-[3.1rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-1.5 text-left hover:bg-paper-2 md:gap-3 md:px-6", inspector?.kind === "transaction" && inspector.id === txn.id && "bg-pen-wash")}>
                <time className="num text-xs text-ink-3" dateTime={txn.date}>{formatDate(txn.date, "d MMM")}</time>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{txn.description}</span>
                  <span className="block truncate text-xs text-ink-3">
                    {txn.type === "card_payment" || txn.type === "transfer" ? (amount > 0 ? `From ${ledgerAccountShort(txn.accountId)}` : "Transfer") : getCategory(txn.categoryId).name}
                    {txn.status === "pending" ? " · Pending" : ""}
                  </span>
                </span>
                <span className="flex items-center justify-end gap-2">
                  <CardAmount value={amount} sign="always" className={cx("num text-sm font-semibold", amount > 0 && "text-green")} />
                  <ChevronRight size={14} className="hidden shrink-0 text-ink-3 min-[400px]:block" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={filter === "payments" ? ArrowDownLeft : ReceiptText} title={filter === "payments" ? "No payments recorded" : "No transactions in this view"} />
      )}
      {displayed.length > ACTIVITY_LIMIT && (
        <div className="flex justify-between px-4 py-2 md:px-6">
          <span className="my-auto text-xs text-ink-3">{visible.length} of {displayed.length} transactions</span>
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : "Show all activity in view"}</button>
        </div>
      )}
    </section>
  );
}

function StatementHistory({ statements, active, onView }: { statements: CardStatement[]; active?: string; onView: (statement: CardStatement) => void }) {
  const [showAll, setShowAll] = useState(false);
  const newestFirst = [...statements].reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, STATEMENT_LIMIT);

  return (
    <section className="border-t border-rule" aria-labelledby="card-statements-title">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 md:px-6">
        <SectionTitle id="card-statements-title" icon={CalendarDays}>Statement history</SectionTitle>
        {statements.length > STATEMENT_LIMIT && <button type="button" className="btn btn-sm" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show recent statements" : `Show all ${statements.length} statements`}
        </button>}
      </div>
      {statements.length ? (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Statement</th>
                <th scope="col" className="hidden sm:table-cell">Due date</th>
                <th scope="col" className="r">Total</th>
                <th scope="col" className="r hidden sm:table-cell">Remaining</th>
                <th scope="col" className="hidden sm:table-cell">Status</th>
                <th scope="col" className="r"><span className="sr-only">View transactions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((statement) => (
                <tr key={statement.date} className={cx(active === statement.date && "bg-pen-wash")}>
                  <td>
                    <time dateTime={statement.date} className="block font-semibold tabular-nums">{formatDate(statement.date)}</time>
                    <div className="text-xs text-ink-3 sm:hidden">Due <time dateTime={statement.due}>{formatDate(statement.due, "d MMM")}</time></div>
                  </td>
                  <td className="hidden sm:table-cell"><time dateTime={statement.due} className="tabular-nums">{formatDate(statement.due, "d MMM")}</time></td>
                  <td className="r num">
                    <Money value={statement.amount} />
                    <div className="mt-0.5 sm:hidden">
                      <StatementStatus statement={statement} />
                      {statement.remaining > 0 && statement.remaining < statement.amount && <div className="text-xs text-red"><CardAmount value={statement.remaining} /> left</div>}
                    </div>
                  </td>
                  <td className={cx("r num hidden sm:table-cell", statement.remaining > 0 ? "font-semibold text-red" : "text-ink-3")}><CardAmount value={statement.remaining} /></td>
                  <td className="hidden sm:table-cell"><StatementStatus statement={statement} /></td>
                  <td className="r"><button type="button" className="btn btn-sm btn-ghost whitespace-nowrap max-sm:min-h-10" aria-label={`View transactions for ${formatDate(statement.date)} statement`} onClick={() => onView(statement)}>View <ChevronRight size={13} aria-hidden /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="px-4 pb-4 text-sm text-ink-3 md:px-6">Statements will appear here after the first billing cycle closes.</p>}
    </section>
  );
}

function CardWorkspace({ status }: { status: CardStatus }) {
  const { txns } = useLedger();
  const [filter, setFilter] = useState<ActivityFilter>("cycle");
  const [statementDate, setStatementDate] = useState<ISODate>();
  const activity = useRef<HTMLDivElement>(null);
  const statement = status.statements.find((item) => item.date === statementDate);
  const { card, lastStatement } = status;

  function viewStatement(item: CardStatement) {
    setStatementDate(item.date);
    setFilter("statement");
    activity.current?.focus();
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 px-4 pt-4 pb-3.5 md:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">{card.name}</h2>
          <p className="text-sm text-ink-3">{card.institution} <span aria-hidden>·</span> {card.network} <span aria-hidden>·</span> ending in <span className="num">{card.mask}</span></p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-medium text-pen">
          <a href="#card-rewards" className="inline-flex items-center gap-1 hover:underline">Rewards <ChevronDown size={14} aria-hidden /></a>
          <a href="#card-statements" className="inline-flex items-center gap-1 hover:underline">Statement history <ChevronDown size={14} aria-hidden /></a>
        </div>
      </div>
      <div className="grid gap-px border-y border-rule bg-rule @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PaymentSummary status={status} onViewStatement={viewStatement} />
        <CreditSummary status={status} />
      </div>
      <div className="grid gap-px bg-rule @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 scroll-mt-14 bg-paper" tabIndex={-1} ref={activity} aria-label="Card activity">
          <Activity key={filter === "statement" ? statementDate : card.id} cardId={card.id} rows={accountLedger(card.id, txns)} filter={filter} statement={statement}
            cycleStart={lastStatement ? addDays(lastStatement.date, 1) : undefined} onFilter={setFilter} />
        </div>
        <CardRewards status={status} />
      </div>
      <div id="card-statements" className="scroll-mt-12">
        <StatementHistory statements={status.statements} active={filter === "statement" ? statementDate : undefined} onView={viewStatement} />
      </div>
    </>
  );
}

export function CreditCardsView({ id }: { id?: string }) {
  const { txns } = useLedger();
  const cards = CARDS.map((card) => cardStatus(card.id, txns));
  const selected = cards.find(({ card }) => card.id === id) ?? cards[0];

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3 md:px-6 md:pt-5">
        <h1 className="text-xl font-[650] tracking-tight text-ink">Credit cards</h1>
        <span className="text-xs text-ink-3">Demonstration data <span aria-hidden>·</span> as of {formatDate(AS_OF)}</span>
      </div>
      <nav className="border-y border-rule" aria-label="Your credit cards">
        <ul className="flex flex-wrap gap-x-1 px-2 md:px-4">
          {cards.map((status) => {
            const { card, lastStatement } = status;
            const active = card.id === selected?.card.id;
            return (
              <li key={card.id} className="min-w-0 grow basis-36 md:max-w-72">
                <Link href={entityHref({ kind: "card", id: card.id })} scroll={false} aria-current={active ? "page" : undefined}
                  className={cx("relative flex h-full min-h-[56px] items-center gap-2 border-b-2 px-2.5 py-2 text-left hover:bg-paper-2 sm:gap-3 sm:px-3",
                    active ? "border-pen bg-pen-wash/45" : "border-transparent")}>
                  <CreditCard size={20} className={cx("hidden shrink-0 sm:block", active ? "text-pen" : "text-ink-3")} aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight text-ink">{card.name}</span>
                      <span className="num block text-xs text-ink-3"><span aria-hidden>••</span><span className="sr-only">ending in </span>{card.mask}</span>
                    </span>
                    {lastStatement && (lastStatement.remaining > 0 ?
                      <span className="text-xs font-semibold whitespace-nowrap text-red">
                        {statementStatus(lastStatement) === "overdue" ? "Overdue" : `Due ${formatDate(lastStatement.due, "d MMM")}`}
                      </span> :
                      <OccurrenceTag status="paid" />)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {selected ? <CardWorkspace key={selected.card.id} status={selected} /> : <EmptyState icon={CreditCard} title="No credit cards in the workspace" />}
    </div>
  );
}
