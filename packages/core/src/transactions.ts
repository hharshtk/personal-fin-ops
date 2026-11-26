/**
 * Rules for listing transactions (periods, type groups, totals) and for the
 * ones a user enters (drafts, validation).
 */
import { CATEGORIES, amountFor, getCard, getCategory, ledgerAccountIds, ledgerAccountName } from "./data";
import { addDays, addMonths, formatDate, monthOf, parts } from "./format";
import type { NewTransaction } from "./payments";
import type { Category, ISODate, PaymentMethod, Transaction, TxnType } from "./types";

/* ───────────── Listing ───────────── */

export type TxnPeriod = "month" | "last-month" | "90d" | "fy" | "all" | "custom";
export type TxnTypeGroup = "all" | "in" | "spending" | "commitments" | "transfers";

export interface TxnFilter {
  /** Defaults to `defaultPeriod`, or to "all" when another filter narrows the list. */
  period?: string;
  from?: ISODate;
  to?: ISODate;
  accountId?: string;
  categoryId?: string;
  type?: string;
  query?: string;
}

export interface PeriodContext {
  asOf: ISODate;
  /** First day the ledger covers. */
  ledgerStart: ISODate;
  fyStartMonth?: number;
}

export function resolvePeriod(filter: TxnFilter, defaultPeriod: string): string {
  return filter.period ?? (filter.categoryId || filter.accountId || filter.query ? "all" : defaultPeriod);
}

/** First and last day of a period, inclusive. An unknown period reads as this month. */
export function periodRange(
  period: string,
  { asOf, ledgerStart, fyStartMonth = 4 }: PeriodContext,
  custom: { from?: ISODate | null; to?: ISODate | null } = {},
): [ISODate, ISODate] {
  const monthStart = `${monthOf(asOf)}-01`;
  switch (period) {
    case "last-month":
      return [addMonths(monthStart, -1), addDays(monthStart, -1)];
    case "90d":
      return [addDays(asOf, -89), asOf];
    case "fy": {
      const { y, m } = parts(asOf);
      return [`${m >= fyStartMonth ? y : y - 1}-${String(fyStartMonth).padStart(2, "0")}-01`, asOf];
    }
    case "all":
      return [ledgerStart, asOf];
    case "custom":
      return [custom.from || ledgerStart, custom.to || asOf];
    default:
      return [monthStart, asOf];
  }
}

const TYPE_GROUPS: Record<string, readonly TxnType[]> = {
  in: ["income", "dividend", "interest", "refund"],
  spending: ["expense"],
  commitments: ["emi", "investment"],
  transfers: ["transfer", "card_payment"],
};

/** Whether a transaction belongs to a type group. An unknown group matches everything. */
export function inTypeGroup(t: Transaction, group: string | undefined): boolean {
  const types = group ? TYPE_GROUPS[group] : undefined;
  return !types || types.includes(t.type);
}

/** Money moved between the user's own accounts and cards. It is not money in or out. */
export function isInternalTransaction(t: Transaction): boolean {
  return inTypeGroup(t, "transfers");
}

export function filterTransactions(txns: Transaction[], filter: TxnFilter, [from, to]: [ISODate, ISODate]): Transaction[] {
  const needle = (filter.query ?? "").trim().toLowerCase();
  return txns.filter(
    (t) =>
      t.date >= from &&
      t.date <= to &&
      (!filter.categoryId || t.categoryId === filter.categoryId) &&
      (!filter.accountId || t.accountId === filter.accountId || t.counterpartyId === filter.accountId) &&
      inTypeGroup(t, filter.type) &&
      (!needle ||
        t.description.toLowerCase().includes(needle) ||
        (t.note ?? "").toLowerCase().includes(needle) ||
        getCategory(t.categoryId).name.toLowerCase().includes(needle)),
  );
}

/** The amount to show: from `accountId`'s side when the list is about one account. */
export function viewAmount(t: Transaction, accountId?: string): number {
  return accountId ? amountFor(t, accountId) : t.amount;
}

export interface TxnTotals {
  moneyIn: number;
  moneyOut: number; // zero or negative
  net: number;
  /** True when the rows include internal transactions that the totals leave out. */
  leavesOutInternal: boolean;
}

export function transactionTotals(rows: Transaction[], accountId?: string): TxnTotals {
  const counted = rows.filter((t) => accountId || !isInternalTransaction(t));
  const moneyIn = counted.reduce((s, t) => s + Math.max(0, viewAmount(t, accountId)), 0);
  const moneyOut = counted.reduce((s, t) => s + Math.min(0, viewAmount(t, accountId)), 0);
  return { moneyIn, moneyOut, net: moneyIn + moneyOut, leavesOutInternal: counted.length < rows.length };
}

/* ───────────── Entering ───────────── */

export type TransactionKind = "expense" | "income" | "transfer";

/** What the user has typed so far. `amount` stays text until it is valid. */
export interface TransactionDraft {
  kind: TransactionKind;
  amount: string;
  date: ISODate;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId: string;
  method: PaymentMethod;
  note: string;
}

export type TransactionDraftErrors = Partial<Record<"amount" | "description" | "date" | "toAccount", string>>;

/** Payment methods a user can choose. Others only arrive from bank statements. */
export const DRAFT_METHODS: readonly PaymentMethod[] = ["UPI", "Card", "Netbanking", "NEFT", "IMPS", "Cash", "Auto-debit"];

const MAX_AMOUNT = 1e8;
const DEFAULT_ACCOUNT = "icici-sb";
const DEFAULT_TO_ACCOUNT = "idfc-sb";

const defaultCategory = (kind: TransactionKind) => (kind === "income" ? "freelance" : "groceries");

function kindOf(t: Partial<Transaction>): TransactionKind {
  if (!t.type) return "expense";
  if (TYPE_GROUPS.in.includes(t.type)) return "income";
  return TYPE_GROUPS.transfers.includes(t.type) ? "transfer" : "expense";
}

/** A draft to start from: empty, prefilled, or an existing transaction to edit. */
export function transactionDraft(asOf: ISODate, from: Partial<Transaction> = {}): TransactionDraft {
  const kind = kindOf(from);
  return {
    kind,
    amount: from.amount ? String(Math.abs(from.amount)) : "",
    date: from.date ?? asOf,
    description: from.description ?? "",
    categoryId: from.categoryId ?? defaultCategory(kind),
    accountId: from.accountId ?? DEFAULT_ACCOUNT,
    toAccountId: from.counterpartyId ?? DEFAULT_TO_ACCOUNT,
    method: from.method ?? "UPI",
    note: from.note ?? "",
  };
}

/** Accounts a draft of this kind can use. Income can't be paid into a credit card. */
export function draftAccountIds(kind: TransactionKind): string[] {
  return ledgerAccountIds.filter((id) => kind !== "income" || !getCard(id));
}

export function draftCategories(kind: TransactionKind): Category[] {
  return CATEGORIES.filter((c) => (kind === "income" ? c.group === "income" : c.group === "essentials" || c.group === "lifestyle"));
}

/** Switch kind, replacing any choice the new kind doesn't allow. */
export function withDraftKind(draft: TransactionDraft, kind: TransactionKind): TransactionDraft {
  return {
    ...draft,
    kind,
    categoryId: defaultCategory(kind),
    accountId: draftAccountIds(kind).includes(draft.accountId) ? draft.accountId : DEFAULT_ACCOUNT,
  };
}

export function draftAmount(draft: TransactionDraft): number {
  return Number(draft.amount.replace(/,/g, ""));
}

export function validateTransactionDraft(draft: TransactionDraft, { asOf, ledgerStart }: { asOf: ISODate; ledgerStart: ISODate }): TransactionDraftErrors {
  const e: TransactionDraftErrors = {};
  const n = draftAmount(draft);
  if (!draft.amount.trim()) e.amount = "Enter an amount.";
  else if (!Number.isFinite(n) || n <= 0) e.amount = "Amount must be a number greater than zero.";
  else if (n > MAX_AMOUNT) e.amount = "That's more than ₹10 crore. Check the amount.";
  if (!draft.description.trim() && draft.kind !== "transfer") e.description = "Add who you paid or who paid you.";
  if (!draft.date) e.date = "Pick a date.";
  else if (draft.date > asOf) e.date = `Date can't be after ${asOf.split("-").reverse().join("-")}, the data's as-of date.`;
  else if (draft.date < ledgerStart) e.date = `The demo ledger starts on ${formatDate(ledgerStart, "d MMM yyyy")}.`;
  if (draft.kind === "transfer" && draft.toAccountId === draft.accountId) e.toAccount = "Choose a different account to move money to.";
  return e;
}

/** The transaction a valid draft describes. */
export function planTransaction(draft: TransactionDraft): NewTransaction {
  const n = Math.round(draftAmount(draft) * 100) / 100;
  const transfer = draft.kind === "transfer";
  return {
    date: draft.date,
    description: draft.description.trim() || `To ${ledgerAccountName(draft.toAccountId, { withMask: false })}`,
    amount: draft.kind === "income" ? n : -n,
    type: draft.kind,
    categoryId: transfer ? "transfer" : draft.categoryId,
    accountId: draft.accountId,
    counterpartyId: transfer ? draft.toAccountId : undefined,
    method: draft.method,
    note: draft.note.trim() || undefined,
  };
}

/** Only the user's own entries can be deleted. The rest come from bank statements. */
export function canDeleteTransaction(t: Transaction): boolean {
  return t.source === "manual";
}

/** A payment recorded against a bill keeps that bill's details, so it can be deleted but not edited. */
export function canEditTransaction(t: Transaction): boolean {
  return t.source === "manual" && !t.occurrenceId;
}
