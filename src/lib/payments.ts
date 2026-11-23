/**
 * Settlement rules for commitment occurrences (EMIs, card bills, SIPs, bills).
 * Plain functions with no React, so the same rules can run behind an API.
 */
import type { Commitment, Occurrence, OccurrenceStatus, PaymentMethod, Transaction, TxnType } from "./types";
import { AS_OF, OCCURRENCES, getCard, getCommitment, remainingBillAmount } from "./data";

export type NewTransaction = Omit<Transaction, "id" | "source" | "status">;

/** The status of an occurrence once the ids in `paid` count as paid. */
export function effectiveStatus(o: Occurrence, paid: ReadonlySet<string>): { status: OccurrenceStatus; paidOn?: string } {
  if (paid.has(o.id)) return { status: "paid", paidOn: AS_OF };
  return { status: o.status, paidOn: o.paidOn };
}

/** Occurrences marked paid, plus card bills whose recorded payments cover the statement. */
export function paidOccurrenceIds(marked: ReadonlySet<string>, txns: Transaction[]): Set<string> {
  const paid = new Set(marked);
  for (const o of OCCURRENCES) {
    if (o.status !== "paid" && getCommitment(o.commitmentId)?.kind === "card" && remainingBillAmount(o, txns) === 0) {
      paid.add(o.id);
    }
  }
  return paid;
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
      note: isCard ? "Payment recorded in Arthashala" : "Marked as paid in Arthashala",
    },
  };
}
