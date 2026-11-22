"use client";

import type { Occurrence, OccurrenceStatus, PaymentMethod, TxnType } from "@/lib/types";
import { AS_OF, getCommitment, getCard } from "@/lib/data";
import { useLedger, useUI } from "./state";

/** The status of an occurrence after this session's "mark as paid" actions. */
export function effectiveStatus(o: Occurrence, paid: Set<string>): { status: OccurrenceStatus; paidOn?: string } {
  if (paid.has(o.id)) return { status: "paid", paidOn: AS_OF };
  return { status: o.status, paidOn: o.paidOn };
}

/**
 * Marking an obligation paid records a session transaction from the paying
 * account, so balances, card outstanding and the attention list all move.
 */
export function usePayOccurrence() {
  const { addTxn, markPaid, unmarkPaid, deleteTxn } = useLedger();
  const { toast } = useUI();
  return (occ: Occurrence) => {
    const c = getCommitment(occ.commitmentId);
    if (!c) return;
    const isCard = c.kind === "card";
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
    const txn = addTxn({
      date: AS_OF,
      description: isCard ? `${c.name.replace(" bill", "")} bill payment` : c.name,
      amount: -occ.amount,
      type,
      categoryId: c.categoryId,
      accountId: c.payFromId,
      counterpartyId: isCard ? c.link?.id : undefined,
      method,
      commitmentId: c.id,
      link: isCard ? undefined : c.link,
      note: "Marked as paid in Arthashala",
    });
    markPaid(occ.id);
    toast({
      message: `${c.name} marked as paid`,
      tone: "success",
      action: {
        label: "Undo",
        run: () => {
          unmarkPaid(occ.id);
          deleteTxn(txn.id);
        },
      },
    });
  };
}
