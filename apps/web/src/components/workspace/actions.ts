"use client";

import type { Occurrence } from "@myfinancespace/core/types";
import { planOccurrencePayment } from "@myfinancespace/core/payments";
import { useLedger, useUI } from "./state";

/**
 * Marking an obligation paid records a session transaction from the paying
 * account, so balances, card outstanding and the attention list all move.
 */
export function usePayOccurrence() {
  const { addTxn, markPaid, unmarkPaid, deleteTxn, txns, paidOccurrences } = useLedger();
  const { toast } = useUI();
  return (occ: Occurrence, paymentAmount?: number) => {
    const plan = planOccurrencePayment(occ, { txns, paid: paidOccurrences, amount: paymentAmount });
    if (!plan) return;
    const { commitment: c, marksPaid } = plan;
    const txn = addTxn(plan.txn);
    if (marksPaid) markPaid(occ.id);
    toast({
      message: marksPaid ? `${c.name} marked as paid` : `${c.name} payment recorded`,
      tone: "success",
      action: {
        label: "Undo",
        run: () => {
          if (marksPaid) unmarkPaid(occ.id);
          deleteTxn(txn.id);
        },
      },
    });
    return txn;
  };
}
