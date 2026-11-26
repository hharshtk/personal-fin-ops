/**
 * The ledger as this session sees it: the base records plus the user's own
 * additions, edits and deletions. Every change is a pure function from one
 * session to the next, so each app only holds the result in its own state.
 */
import type { NewTransaction } from "./payments";
import type { Transaction } from "./types";

export interface LedgerSession {
  added: Transaction[];
  edits: Record<string, Partial<Transaction>>;
  deleted: string[];
}

export const EMPTY_SESSION: LedgerSession = { added: [], edits: {}, deleted: [] };

/** A record the user is adding. The client supplies the id (see `uuidv7`). */
export function manualTransaction(id: string, t: NewTransaction): Transaction {
  return { ...t, id, source: "manual", status: "cleared" };
}

/** Adding a record that is already there changes nothing, so a retry never duplicates it. */
export function createTransaction(s: LedgerSession, t: Transaction): LedgerSession {
  return s.added.some((x) => x.id === t.id) ? s : { ...s, added: [...s.added, t] };
}

export function updateTransaction(s: LedgerSession, id: string, patch: Partial<Transaction>): LedgerSession {
  return { ...s, edits: { ...s.edits, [id]: { ...s.edits[id], ...patch } } };
}

export function deleteTransaction(s: LedgerSession, id: string): LedgerSession {
  return s.deleted.includes(id) ? s : { ...s, deleted: [...s.deleted, id] };
}

export function restoreTransaction(s: LedgerSession, id: string): LedgerSession {
  return { ...s, deleted: s.deleted.filter((x) => x !== id) };
}

/** Every transaction in the session's view, newest first. */
export function sessionTransactions(s: LedgerSession, base: Transaction[]): Transaction[] {
  const deleted = new Set(s.deleted);
  return [...base, ...s.added]
    .filter((t) => !deleted.has(t.id))
    .map((t) => (s.edits[t.id] ? { ...t, ...s.edits[t.id] } : t))
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
}

export function sessionChangeCount(s: LedgerSession): number {
  return s.added.length + Object.keys(s.edits).length + s.deleted.length;
}
