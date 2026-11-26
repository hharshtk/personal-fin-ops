import { TRANSACTIONS } from "@myfinancespace/core/data";
import { formatMoney } from "@myfinancespace/core/format";
import { paidOccurrenceIds, planOccurrencePayment, type NewTransaction } from "@myfinancespace/core/payments";
import {
  createTransaction,
  deleteTransaction,
  EMPTY_SESSION,
  manualTransaction,
  restoreTransaction,
  sessionTransactions,
  updateTransaction,
} from "@myfinancespace/core/session-ledger";
import type { Occurrence, Transaction } from "@myfinancespace/core/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";
import { newId } from "@/ids";

/** A short message after a change, with a way to take it back. */
export interface Notice {
  id: string;
  message: string;
  undo?: () => void;
}

interface Ledger {
  txns: Transaction[];
  paid: ReadonlySet<string>;
  add: (t: NewTransaction) => void;
  update: (id: string, t: NewTransaction) => void;
  remove: (t: Transaction) => void;
  pay: (o: Occurrence) => void;
  notice: Notice | null;
  dismissNotice: () => void;
}

const SHOW_NOTICE_FOR_MS = 6000;

const LedgerContext = createContext<Ledger | null>(null);

/** The base records plus this session's changes. Nothing is stored: closing the app resets it. */
export function LedgerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(EMPTY_SESSION);
  const [notice, setNotice] = useState<Notice | null>(null);
  const txns = sessionTransactions(session, TRANSACTIONS);
  const paid = paidOccurrenceIds(txns);

  useEffect(() => {
    if (!notice) return;
    AccessibilityInfo.announceForAccessibility(notice.message);
    const timer = setTimeout(() => setNotice(null), SHOW_NOTICE_FOR_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const notify = (message: string, undo?: () => void) => setNotice({ id: newId(), message, undo });
  const create = (t: NewTransaction, message: string) => {
    const txn = manualTransaction(newId(), t);
    setSession((s) => createTransaction(s, txn));
    notify(message, () => setSession((s) => deleteTransaction(s, txn.id)));
  };

  const ledger: Ledger = {
    txns,
    paid,
    add: (t) => create(t, `Added ${formatMoney(t.amount, { sign: "always" })} · ${t.description}`),
    update: (id, t) => {
      setSession((s) => updateTransaction(s, id, t));
      notify("Transaction saved");
    },
    remove: (t) => {
      setSession((s) => deleteTransaction(s, t.id));
      notify("Transaction deleted", () => setSession((s) => restoreTransaction(s, t.id)));
    },
    pay: (o) => {
      const plan = planOccurrencePayment(o, { txns, paid });
      if (plan) create(plan.txn, plan.marksPaid ? `${plan.commitment.name} marked as paid` : `${plan.commitment.name} payment recorded`);
    },
    notice,
    dismissNotice: () => setNotice(null),
  };

  return <LedgerContext.Provider value={ledger}>{children}</LedgerContext.Provider>;
}

export function useLedger(): Ledger {
  const ledger = useContext(LedgerContext);
  if (!ledger) throw new Error("useLedger outside LedgerProvider");
  return ledger;
}
