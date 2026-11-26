/**
 * Settlement rules for commitment occurrences (EMIs, card bills, SIPs, bills).
 * Plain functions with no React, so the same rules can run behind an API.
 */
import type { Commitment, ISODate, Occurrence, OccurrenceStatus, PaymentMethod, Transaction, TxnType } from "./types";
import { AS_OF, AS_OF_MONTH, OCCURRENCES, TRANSACTIONS, cardBillPayments, getCard, getCommitment, remainingBillAmount } from "./data";
import { diffDays, monthOf } from "./format";

export type NewTransaction = Omit<Transaction, "id" | "source" | "status">;

/** The status of an occurrence once the ids in `paid` count as paid. */
export function effectiveStatus(o: Occurrence, paid: ReadonlySet<string>): { status: OccurrenceStatus; paidOn?: string } {
  if (paid.has(o.id)) return { status: "paid", paidOn: AS_OF };
  return { status: o.status, paidOn: o.paidOn };
}

/**
 * Occurrences the ledger shows as paid since the data was drawn up: bills with
 * a payment the user recorded against them, and card bills whose payments cover
 * the statement. Deleting the payment makes the bill unpaid again.
 */
export function paidOccurrenceIds(txns: Transaction[]): Set<string> {
  const recorded = new Set(txns.filter((t) => t.source === "manual" && t.occurrenceId && t.amount < 0).map((t) => t.occurrenceId));
  const paid = new Set<string>();
  for (const o of OCCURRENCES) {
    if (o.status === "paid") continue;
    const isCard = getCommitment(o.commitmentId)?.kind === "card";
    if (isCard ? remainingBillAmount(o, txns) === 0 : recorded.has(o.id)) paid.add(o.id);
  }
  return paid;
}

/** An occurrence with its effective status, and what is still owed on it (or what was paid). */
export interface Bill {
  o: Occurrence;
  status: OccurrenceStatus;
  paidOn?: string;
  amount: number;
}

export function billFor(o: Occurrence, txns: Transaction[], paid: ReadonlySet<string>): Bill {
  const status = effectiveStatus(o, paid);
  return { o, ...status, amount: status.status === "paid" ? o.amount : remainingBillAmount(o, txns) };
}

/**
 * Bills from the start of this month to `days` ahead that still need paying or
 * are scheduled. Ones in `paid` stay listed, stamped as paid, rather than vanish.
 */
export function upcomingBills(
  txns: Transaction[] = TRANSACTIONS,
  paid: ReadonlySet<string> = new Set(),
  { days = 10, limit = 8 }: { days?: number; limit?: number } = {},
): Bill[] {
  return OCCURRENCES.filter((o) => o.date >= `${AS_OF_MONTH}-01` && diffDays(o.date, AS_OF) <= days)
    .map((o) => billFor(o, txns, paid))
    .filter((b) => b.status !== "paid" || paid.has(b.o.id))
    .slice(0, limit);
}

export interface BillTotal {
  count: number;
  amount: number;
}

const total = (bills: Bill[]): BillTotal => ({ count: bills.length, amount: bills.reduce((s, b) => s + b.amount, 0) });

/** What is late, what the user must pay, what will pay itself, and what this month has cleared. */
export function billSummary(bills: Bill[], asOf: ISODate, days = 30) {
  const soon = (b: Bill) => diffDays(b.o.date, asOf) <= days;
  return {
    overdue: total(bills.filter((b) => b.status === "overdue")),
    due: total(bills.filter((b) => b.status === "due" && soon(b))),
    autopay: total(bills.filter((b) => b.status === "scheduled" && soon(b))),
    paidThisMonth: total(bills.filter((b) => b.status === "paid" && b.o.date.startsWith(monthOf(asOf)))),
  };
}

/** Bills that wait for the user to pay them. */
export function needsPayment(b: Pick<Bill, "status">): boolean {
  return b.status === "due" || b.status === "overdue";
}

/** The transaction that paid an occurrence, or the latest part payment of a card bill. */
export function paymentFor(o: Occurrence, txns: Transaction[]): Transaction | undefined {
  const c = getCommitment(o.commitmentId);
  if (c?.kind === "card" && c.link) return cardBillPayments(o.id, c.link.id, txns)[0];
  return o.txnId ? txns.find((t) => t.id === o.txnId) : txns.find((t) => t.source === "manual" && t.occurrenceId === o.id);
}

/** The last few times this commitment came round before `o`, newest first. */
export function earlierOccurrences(o: Occurrence, limit = 4): Occurrence[] {
  return OCCURRENCES.filter((x) => x.commitmentId === o.commitmentId && x.date < o.date).slice(-limit).reverse();
}

export interface OccurrencePayment {
  commitment: Commitment;
  txn: NewTransaction;
  /** Card bills settle once payments cover the statement; everything else is marked paid. */
  marksPaid: boolean;
}

/**
 * The transaction that pays `occ` from its commitment's paying account, or
 * null when it can't be paid: unknown commitment, already paid, or an amount
 * that isn't positive or exceeds what is still owed. `amount` defaults to the
 * full remaining amount; only card bills owe less than the occurrence amount.
 */
export function planOccurrencePayment(
  occ: Occurrence,
  { txns, paid, amount: requested }: { txns: Transaction[]; paid: ReadonlySet<string>; amount?: number },
): OccurrencePayment | null {
  const c = getCommitment(occ.commitmentId);
  if (!c || effectiveStatus(occ, paid).status === "paid") return null;
  const isCard = c.kind === "card";
  const remaining = isCard ? remainingBillAmount(occ, txns) : occ.amount;
  const amount = requested ?? remaining;
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) return null;
  const type: TxnType = isCard
    ? "card_payment"
    : c.kind === "emi"
      ? "emi"
      : c.kind === "sip" || c.kind === "deposit"
        ? "investment"
        : c.kind === "transfer"
          ? "transfer"
          : "expense";
  const method: PaymentMethod = getCard(c.payFromId) ? "Card" : isCard ? "Netbanking" : "UPI";
  return {
    commitment: c,
    marksPaid: !isCard,
    txn: {
      date: AS_OF,
      description: isCard ? `${c.name.replace(" bill", "")} bill payment` : c.name,
      amount: -amount,
      type,
      categoryId: c.categoryId,
      accountId: c.payFromId,
      counterpartyId: isCard ? c.link?.id : undefined,
      method,
      commitmentId: c.id,
      occurrenceId: occ.id,
      link: isCard ? undefined : c.link,
      note: isCard ? "Payment recorded in MyFinanceSpace" : "Marked as paid in MyFinanceSpace",
    },
  };
}
