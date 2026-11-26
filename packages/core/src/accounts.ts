/** Figures for one account or deposit. */
import type { LedgerRow } from "./data";
import { addDays, diffDays } from "./format";
import type { CashAccount, ISODate } from "./types";

export function isDeposit(a: CashAccount): boolean {
  return a.kind === "fd" || a.kind === "rd";
}

/** Money in and out over the last `days` days, counting `asOf` itself. */
export function accountActivity(ledger: LedgerRow[], asOf: ISODate, days = 30) {
  const since = addDays(asOf, -(days - 1));
  const rows = ledger.filter((r) => r.txn.date >= since);
  return {
    moneyIn: rows.reduce((s, r) => s + Math.max(0, r.amount), 0),
    moneyOut: rows.reduce((s, r) => s + Math.min(0, r.amount), 0),
    credits: rows.filter((r) => r.amount > 0).length,
    debits: rows.filter((r) => r.amount < 0).length,
  };
}

/** How far a deposit is through its term, and what it earns. Null for an account that isn't a deposit. */
export function depositStatus(a: CashAccount, asOf: ISODate) {
  if (!isDeposit(a) || !a.maturityDate || a.maturityAmount === undefined || a.principal === undefined) return null;
  const paidIn = a.kind === "rd" ? (a.installment ?? 0) * (a.installmentsTotal ?? 0) : a.principal;
  return {
    maturesOn: a.maturityDate,
    maturityAmount: a.maturityAmount,
    principal: a.principal,
    elapsed: Math.max(0, Math.min(1, diffDays(asOf, a.openedOn) / diffDays(a.maturityDate, a.openedOn))),
    interestSoFar: a.balance - a.principal,
    interestAtMaturity: a.maturityAmount - paidIn,
    /** Close enough to maturity to decide whether to renew. */
    renewalSoon: diffDays(a.maturityDate, asOf) <= 30,
  };
}
