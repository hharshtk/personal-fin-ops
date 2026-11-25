"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { NumberSystem } from "@myfinancespace/core/format";
import type { EntityRef, EquityActivity, EquityMarketInput, EquityPlan, EquityPlanKind, Transaction } from "@myfinancespace/core/types";
import { EQUITY_MARKET_INPUTS, EQUITY_PLANS, TRANSACTIONS } from "@myfinancespace/core/data";
import { upsertEquityInput, upsertEquityPlan } from "@myfinancespace/core/employee-equity";
import { paidOccurrenceIds } from "@myfinancespace/core/payments";
import { TRANSCRIPTION_DEFAULT_MODEL } from "@myfinancespace/core/transcription";

/* ───────────── Preferences (session only) ───────────── */

export interface Prefs {
  numberSystem: NumberSystem;
  compactFigures: boolean;
  fyStartMonth: 1 | 4;
  weekStart: 0 | 1;
  billReminderDays: number;
  budgetAlertAt: number;
  defaultTxnPeriod: "month" | "90d" | "fy" | "all";
  showPaise: boolean;
  /** Account-level (Article 11): an AI Gateway model id from TRANSCRIPTION_MODELS. */
  transcriptionModel: string;
}

const DEFAULT_PREFS: Prefs = {
  numberSystem: "indian",
  compactFigures: true,
  fyStartMonth: 4,
  weekStart: 1,
  billReminderDays: 7,
  budgetAlertAt: 90,
  defaultTxnPeriod: "month",
  showPaise: false,
  // The cheapest model, so a reset never costs more.
  transcriptionModel: TRANSCRIPTION_DEFAULT_MODEL,
};

interface PrefsCtx {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  resetPrefs: () => void;
}
const PrefsContext = createContext<PrefsCtx | null>(null);

/* ───────────── Ledger (base data + this session's edits) ───────────── */

interface LedgerCtx {
  txns: Transaction[];
  addTxn: (t: Omit<Transaction, "id" | "source" | "status">) => Transaction;
  updateTxn: (id: string, patch: Partial<Transaction>) => void;
  deleteTxn: (id: string) => void;
  restoreTxn: (t: Transaction) => void;
  paidOccurrences: Set<string>;
  markPaid: (occurrenceId: string) => void;
  unmarkPaid: (occurrenceId: string) => void;
  sessionChanges: number;
  resetSession: () => void;
}
const LedgerContext = createContext<LedgerCtx | null>(null);

interface EquitySession {
  plans: EquityPlan[];
  inputs: EquityMarketInput[];
  changes: number;
}

interface EquityCtx extends EquitySession {
  savePlan: (plan: EquityPlan) => void;
  saveInput: (input: EquityMarketInput) => void;
  resetEquity: () => void;
}

const BASE_EQUITY: EquitySession = { plans: EQUITY_PLANS, inputs: EQUITY_MARKET_INPUTS, changes: 0 };
const EquityContext = createContext<EquityCtx | null>(null);

/* ───────────── UI (inspector, palette, toasts) ───────────── */

export type InspectTarget =
  | EntityRef
  | { kind: "new-transaction"; id: string; preset?: Partial<Transaction> }
  | { kind: "edit-transaction"; id: string }
  | { kind: "equity-plan"; id: string }
  | { kind: "new-equity-plan"; id: EquityPlanKind }
  | { kind: "edit-equity-plan"; id: string }
  | { kind: "equity-activity"; id: string; action: EquityActivity["kind"]; recordId?: string }
  | { kind: "equity-inputs"; id: string };

export interface Toast {
  id: number;
  message: string;
  tone?: "default" | "success" | "critical";
  action?: { label: string; run: () => void };
}

interface UICtx {
  inspector: InspectTarget | null;
  /** Open a target in the inspector. Drill-downs from inside the inspector keep a back stack. */
  inspect: (t: InspectTarget, opts?: { push?: boolean }) => void;
  inspectorBack: () => void;
  canGoBack: boolean;
  closeInspector: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
}
const UIContext = createContext<UICtx | null>(null);

let toastSeq = 0;
let manualSeq = 0;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [equitySession, setEquitySession] = useState(BASE_EQUITY);
  const equity = useMemo<EquityCtx>(() => ({
    ...equitySession,
    savePlan: (plan) => setEquitySession((session) => ({
      ...session,
      plans: upsertEquityPlan(session.plans, plan),
      changes: session.changes + 1,
    })),
    saveInput: (input) => setEquitySession((session) => ({
      ...session,
      inputs: upsertEquityInput(session.inputs, input),
      changes: session.changes + 1,
    })),
    resetEquity: () => setEquitySession(BASE_EQUITY),
  }), [equitySession]);

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);
  const resetPrefs = useCallback(() => setPrefs(DEFAULT_PREFS), []);

  const [added, setAdded] = useState<Transaction[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Transaction>>>({});
  const [deleted, setDeleted] = useState<Set<string>>(() => new Set());
  const [markedPaid, setPaid] = useState<Set<string>>(() => new Set());

  const txns = useMemo(() => {
    const base = TRANSACTIONS.filter((t) => !deleted.has(t.id)).map((t) => (edits[t.id] ? { ...t, ...edits[t.id] } : t));
    const extra = added.filter((t) => !deleted.has(t.id)).map((t) => (edits[t.id] ? { ...t, ...edits[t.id] } : t));
    return [...base, ...extra].sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
  }, [added, edits, deleted]);

  const paidOccurrences = useMemo(() => paidOccurrenceIds(markedPaid, txns), [markedPaid, txns]);

  const ledger = useMemo<LedgerCtx>(
    () => ({
      txns,
      addTxn: (t) => {
        manualSeq += 1;
        const txn: Transaction = { ...t, id: `m${String(manualSeq).padStart(3, "0")}`, source: "manual", status: "cleared" };
        setAdded((a) => [...a, txn]);
        return txn;
      },
      updateTxn: (id, patch) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } })),
      deleteTxn: (id) => setDeleted((s) => new Set(s).add(id)),
      restoreTxn: (t) =>
        setDeleted((s) => {
          const n = new Set(s);
          n.delete(t.id);
          return n;
        }),
      paidOccurrences,
      markPaid: (id) => setPaid((s) => new Set(s).add(id)),
      unmarkPaid: (id) =>
        setPaid((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
      sessionChanges: added.length + Object.keys(edits).length + deleted.size + markedPaid.size,
      resetSession: () => {
        setAdded([]);
        setEdits({});
        setDeleted(new Set());
        setPaid(new Set());
      },
    }),
    [txns, paidOccurrences, added.length, edits, deleted.size, markedPaid.size],
  );

  const [stack, setStack] = useState<InspectTarget[]>([]);
  const inspector = stack.length ? stack[stack.length - 1] : null;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      toastSeq += 1;
      const id = toastSeq;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismissToast(id), 5000);
    },
    [dismissToast],
  );

  const ui = useMemo<UICtx>(
    () => ({
      inspector,
      inspect: (t, opts) => setStack((s) => (opts?.push && s.length ? [...s.slice(-8), t] : [t])),
      inspectorBack: () => setStack((s) => s.slice(0, -1)),
      canGoBack: stack.length > 1,
      closeInspector: () => setStack([]),
      paletteOpen,
      setPaletteOpen,
      shortcutsOpen,
      setShortcutsOpen,
      navOpen,
      setNavOpen,
      toasts,
      toast,
      dismissToast,
    }),
    [inspector, stack.length, paletteOpen, shortcutsOpen, navOpen, toasts, toast, dismissToast],
  );

  const prefsValue = useMemo(() => ({ prefs, setPref, resetPrefs }), [prefs, setPref, resetPrefs]);

  return (
    <PrefsContext.Provider value={prefsValue}>
      <LedgerContext.Provider value={ledger}>
        <EquityContext.Provider value={equity}>
          <UIContext.Provider value={ui}>{children}</UIContext.Provider>
        </EquityContext.Provider>
      </LedgerContext.Provider>
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside WorkspaceProvider");
  return ctx;
}
export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger outside WorkspaceProvider");
  return ctx;
}
export function useEmployeeEquity() {
  const ctx = useContext(EquityContext);
  if (!ctx) throw new Error("useEmployeeEquity outside WorkspaceProvider");
  return ctx;
}
export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI outside WorkspaceProvider");
  return ctx;
}
