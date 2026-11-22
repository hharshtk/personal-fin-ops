"use client";

import { useId, useState, type FormEvent } from "react";
import type { PaymentMethod, Transaction, TxnType } from "@/lib/types";
import { AS_OF, CARDS, CASH_ACCOUNTS, CATEGORIES, DATA_START_DATE, ledgerAccountName } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { useLedger, useUI } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";

type Kind = "expense" | "income" | "transfer";

const LEDGER_ACCOUNTS = [
  ...CASH_ACCOUNTS.filter((a) => a.kind === "savings" || a.kind === "cash").map((a) => ({ id: a.id, label: ledgerAccountName(a.id) })),
  ...CARDS.map((c) => ({ id: c.id, label: ledgerAccountName(c.id) })),
];
const METHODS: PaymentMethod[] = ["UPI", "Card", "Netbanking", "NEFT", "IMPS", "Cash", "Auto-debit"];

function kindOf(t?: Partial<Transaction>): Kind {
  if (!t?.type) return "expense";
  if (t.type === "income" || t.type === "interest" || t.type === "dividend" || t.type === "refund") return "income";
  if (t.type === "transfer" || t.type === "card_payment") return "transfer";
  return "expense";
}

export function TransactionForm({ editId, preset }: { editId?: string; preset?: Partial<Transaction> }) {
  const { txns, addTxn, updateTxn } = useLedger();
  const { inspect, closeInspector, toast } = useUI();
  const existing = editId ? txns.find((t) => t.id === editId) : undefined;
  const base = existing ?? preset;
  const uid = useId();

  const [kind, setKind] = useState<Kind>(kindOf(base));
  const [amount, setAmount] = useState(base?.amount ? String(Math.abs(base.amount)) : "");
  const [date, setDate] = useState(base?.date ?? AS_OF);
  const [description, setDescription] = useState(base?.description ?? "");
  const [categoryId, setCategoryId] = useState(base?.categoryId ?? (kindOf(base) === "income" ? "freelance" : "groceries"));
  const [accountId, setAccountId] = useState(base?.accountId ?? "icici-sb");
  const [toAccount, setToAccount] = useState(base?.counterpartyId ?? "idfc-sb");
  const [method, setMethod] = useState<PaymentMethod>(base?.method ?? "UPI");
  const [note, setNote] = useState(base?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const cats = CATEGORIES.filter((c) => (kind === "income" ? c.group === "income" : c.group === "essentials" || c.group === "lifestyle"));

  function validate() {
    const e: Record<string, string> = {};
    const n = Number(amount.replace(/,/g, ""));
    if (!amount.trim()) e.amount = "Enter an amount.";
    else if (!Number.isFinite(n) || n <= 0) e.amount = "Amount must be a number greater than zero.";
    else if (n > 1e8) e.amount = "That's more than ₹10 crore. Check the amount.";
    if (!description.trim() && kind !== "transfer") e.description = "Add who you paid or who paid you.";
    if (!date) e.date = "Pick a date.";
    else if (date > AS_OF) e.date = `Date can't be after ${AS_OF.split("-").reverse().join("-")}, the data's as-of date.`;
    else if (date < DATA_START_DATE) e.date = "The demo ledger starts on 01 May 2026.";
    if (kind === "transfer" && toAccount === accountId) e.toAccount = "Choose a different account to move money to.";
    return e;
  }

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
    const n = Math.round(Number(amount.replace(/,/g, "")) * 100) / 100;
    const type: TxnType = kind === "income" ? "income" : kind === "transfer" ? "transfer" : "expense";
    const payload = {
      date,
      description: description.trim() || `To ${ledgerAccountName(toAccount, { withMask: false })}`,
      amount: kind === "income" ? n : -n,
      type,
      categoryId: kind === "transfer" ? "transfer" : categoryId,
      accountId,
      counterpartyId: kind === "transfer" ? toAccount : undefined,
      method,
      note: note.trim() || undefined,
    };
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
  const err = (k: string) => live[k];

  return (
    <form onSubmit={submit} noValidate className="px-5 py-4">
      <h2 className="text-lg font-semibold text-ink">{existing ? "Edit transaction" : "Add a transaction"}</h2>
      <p className="mt-1 text-sm text-ink-3">For cash spends and anything your bank statement doesn&apos;t show. It stays in this session only.</p>

      <div className="seg mt-4" role="group" aria-label="Transaction type">
        {(["expense", "income", "transfer"] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setCategoryId(k === "income" ? "freelance" : "groceries");
            }}
          >
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
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            aria-invalid={Boolean(err("amount"))}
            aria-describedby={err("amount") ? `${uid}-amount-err` : undefined}
            autoFocus
          />
          {amount && !err("amount") && <p className="mt-1 text-xs text-ink-3">{formatMoney(Number(amount.replace(/,/g, "")) || 0)}</p>}
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
            onChange={(e) => setDate(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
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
          <select id={`${uid}-account`} className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {LEDGER_ACCOUNTS.filter((a) => kind !== "income" || !a.id.endsWith("-cc")).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
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
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              aria-invalid={Boolean(err("toAccount"))}
              aria-describedby={err("toAccount") ? `${uid}-toAccount-err` : undefined}
            >
              {LEDGER_ACCOUNTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
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
            <select id={`${uid}-category`} className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.map((c) => (
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
          <select id={`${uid}-method`} className="select" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="field-label" htmlFor={`${uid}-note`}>
            Note
          </label>
          <textarea id={`${uid}-note`} className="input min-h-14" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
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
