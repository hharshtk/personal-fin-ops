"use client";

import { useId, useState, type FormEvent } from "react";
import type { PaymentMethod, Transaction } from "@myfinancespace/core/types";
import { AS_OF, DATA_START_DATE, ledgerAccountName } from "@myfinancespace/core/data";
import { formatMoney } from "@myfinancespace/core/format";
import {
  DRAFT_METHODS,
  draftAccountIds,
  draftAmount,
  draftCategories,
  planTransaction,
  transactionDraft,
  validateTransactionDraft,
  withDraftKind,
  type TransactionDraft,
  type TransactionDraftErrors,
} from "@myfinancespace/core/transactions";
import { useLedger, useUI } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";

export function TransactionForm({ editId, preset }: { editId?: string; preset?: Partial<Transaction> }) {
  const { txns, addTxn, updateTxn } = useLedger();
  const { inspect, closeInspector, toast } = useUI();
  const existing = editId ? txns.find((t) => t.id === editId) : undefined;
  const uid = useId();

  const [draft, setDraft] = useState(() => transactionDraft(AS_OF, existing ?? preset));
  const { kind, amount, date, description, categoryId, accountId, toAccountId, method, note } = draft;
  const set = (patch: Partial<TransactionDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const [errors, setErrors] = useState<TransactionDraftErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => validateTransactionDraft(draft, { asOf: AS_OF, ledgerStart: DATA_START_DATE });

  function submit(ev: FormEvent) {
    ev.preventDefault();
    setSubmitted(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    const payload = planTransaction(draft);
    if (existing) {
      updateTxn(existing.id, payload);
      toast({ message: "Transaction saved", tone: "success" });
      inspect({ kind: "transaction", id: existing.id });
    } else {
      const t = addTxn(payload);
      toast({ message: `Added ${formatMoney(payload.amount, { sign: "always" })} · ${payload.description}`, tone: "success" });
      inspect({ kind: "transaction", id: t.id });
    }
  }

  const live = submitted ? validate() : errors;
  const err = (k: keyof TransactionDraftErrors) => live[k];

  return (
    <form onSubmit={submit} noValidate className="px-5 py-4">
      <h2 className="text-lg font-semibold text-ink">{existing ? "Edit transaction" : "Add a transaction"}</h2>
      <p className="mt-1 text-sm text-ink-3">For cash spends and anything your bank statement doesn&apos;t show. It stays in this session only.</p>

      <div className="seg mt-4" role="group" aria-label="Transaction type">
        {(["expense", "income", "transfer"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setDraft((d) => withDraftKind(d, k))}>
            {k === "expense" ? "Money out" : k === "income" ? "Money in" : "Transfer"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="field-label" htmlFor={`${uid}-amount`}>
            Amount (₹)
          </label>
          <input
            id={`${uid}-amount`}
            className="input num text-base font-semibold"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => set({ amount: e.target.value.replace(/[^\d.,]/g, "") })}
            aria-invalid={Boolean(err("amount"))}
            aria-describedby={err("amount") ? `${uid}-amount-err` : undefined}
            autoFocus
          />
          {amount && !err("amount") && <p className="mt-1 text-xs text-ink-3">{formatMoney(draftAmount(draft) || 0)}</p>}
          {err("amount") && (
            <p id={`${uid}-amount-err`} className="mt-1 text-xs text-red">
              {err("amount")}
            </p>
          )}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="field-label" htmlFor={`${uid}-date`}>
            Date
          </label>
          <input
            id={`${uid}-date`}
            type="date"
            className="input num"
            value={date}
            min={DATA_START_DATE}
            max={AS_OF}
            onChange={(e) => set({ date: e.target.value })}
            aria-invalid={Boolean(err("date"))}
            aria-describedby={err("date") ? `${uid}-date-err` : undefined}
          />
          {err("date") && (
            <p id={`${uid}-date-err`} className="mt-1 text-xs text-red">
              {err("date")}
            </p>
          )}
        </div>

        <div className="col-span-2">
          <label className="field-label" htmlFor={`${uid}-description`}>
            {kind === "income" ? "From" : kind === "transfer" ? "Description (optional)" : "Paid to"}
          </label>
          <input
            id={`${uid}-description`}
            className="input"
            placeholder={kind === "income" ? "e.g. Lumen Labs" : kind === "transfer" ? "e.g. Top up emergency fund" : "e.g. Sunday market · vegetables"}
            value={description}
            onChange={(e) => set({ description: e.target.value })}
            aria-invalid={Boolean(err("description"))}
            aria-describedby={err("description") ? `${uid}-description-err` : undefined}
          />
          {err("description") && (
            <p id={`${uid}-description-err`} className="mt-1 text-xs text-red">
              {err("description")}
            </p>
          )}
        </div>

        <div className={cx(kind === "transfer" ? "col-span-2 sm:col-span-1" : "col-span-2 sm:col-span-1")}>
          <label className="field-label" htmlFor={`${uid}-account`}>
            {kind === "income" ? "Into account" : "From account"}
          </label>
          <select id={`${uid}-account`} className="select" value={accountId} onChange={(e) => set({ accountId: e.target.value })}>
            {draftAccountIds(kind).map((id) => (
              <option key={id} value={id}>
                {ledgerAccountName(id)}
              </option>
            ))}
          </select>
        </div>

        {kind === "transfer" ? (
          <div className="col-span-2 sm:col-span-1">
            <label className="field-label" htmlFor={`${uid}-toAccount`}>
              To account
            </label>
            <select
              id={`${uid}-toAccount`}
              className="select"
              value={toAccountId}
              onChange={(e) => set({ toAccountId: e.target.value })}
              aria-invalid={Boolean(err("toAccount"))}
              aria-describedby={err("toAccount") ? `${uid}-toAccount-err` : undefined}
            >
              {draftAccountIds(kind).map((id) => (
                <option key={id} value={id}>
                  {ledgerAccountName(id)}
                </option>
              ))}
            </select>
            {err("toAccount") && (
              <p id={`${uid}-toAccount-err`} className="mt-1 text-xs text-red">
                {err("toAccount")}
              </p>
            )}
          </div>
        ) : (
          <div className="col-span-2 sm:col-span-1">
            <label className="field-label" htmlFor={`${uid}-category`}>
              Category
            </label>
            <select id={`${uid}-category`} className="select" value={categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              {draftCategories(kind).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="col-span-2 sm:col-span-1">
          <label className="field-label" htmlFor={`${uid}-method`}>
            Paid by
          </label>
          <select id={`${uid}-method`} className="select" value={method} onChange={(e) => set({ method: e.target.value as PaymentMethod })}>
            {DRAFT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="field-label" htmlFor={`${uid}-note`}>
            Note
          </label>
          <textarea id={`${uid}-note`} className="input min-h-14" value={note} onChange={(e) => set({ note: e.target.value })} placeholder="Optional" />
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-t border-rule pt-4">
        <button type="submit" className="btn btn-primary">
          {existing ? "Save changes" : "Add transaction"}
        </button>
        <button type="button" className="btn" onClick={() => (existing ? inspect({ kind: "transaction", id: existing.id }) : closeInspector())}>
          Cancel
        </button>
      </div>
    </form>
  );
}
