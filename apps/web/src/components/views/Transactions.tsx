"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Download, PenLine, Plus, SearchX, StickyNote, X } from "lucide-react";
import type { Transaction } from "@myfinancespace/core/types";
import { AS_OF, AS_OF_MONTH, CATEGORIES, amountFor, getCard, getCategory, ledgerAccountIds, ledgerAccountName, ledgerAccountShort, DATA_START_DATE } from "@myfinancespace/core/data";
import { addDays, addMonths, formatDate, formatMoney, parts } from "@myfinancespace/core/format";
import { useLedger, usePrefs, useUI } from "@/components/workspace/state";
import { Money } from "@/components/ui/money";
import { DateMark, EmptyState, PageHeader, Tag } from "@/components/ui/primitives";
import { SortTh, TableWrap, useSort } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";

const PERIODS = [
  { id: "month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "90d", label: "Last 90 days" },
  { id: "fy", label: "FY to date" },
  { id: "all", label: `All (since ${formatDate(DATA_START_DATE, "MMM")})` },
  { id: "custom", label: "Custom range" },
] as const;

const TYPES = [
  { id: "all", label: "All types" },
  { id: "in", label: "Money in" },
  { id: "spending", label: "Spending" },
  { id: "commitments", label: "EMIs & investments" },
  { id: "transfers", label: "Transfers & card bills" },
] as const;

const MONTH_START = `${AS_OF_MONTH}-01`;
/** Financial-year-to-date filters start in April. */
const FY_START = `${parts(AS_OF).m >= 4 ? parts(AS_OF).y : parts(AS_OF).y - 1}-04-01`;

function periodRange(period: string, from?: string | null, to?: string | null): [string, string] {
  switch (period) {
    case "last-month":
      return [addMonths(MONTH_START, -1), addDays(MONTH_START, -1)];
    case "90d":
      return [addDays(AS_OF, -89), AS_OF];
    case "fy":
      return [FY_START, AS_OF];
    case "all":
      return [DATA_START_DATE, AS_OF];
    case "custom":
      return [from || DATA_START_DATE, to || AS_OF];
    default:
      return [MONTH_START, AS_OF];
  }
}

function typeMatch(t: Transaction, type: string) {
  switch (type) {
    case "in":
      return t.type === "income" || t.type === "dividend" || t.type === "interest" || t.type === "refund";
    case "spending":
      return t.type === "expense";
    case "commitments":
      return t.type === "emi" || t.type === "investment";
    case "transfers":
      return t.type === "transfer" || t.type === "card_payment";
    default:
      return true;
  }
}

const isInternal = (t: Transaction) => t.type === "transfer" || t.type === "card_payment";

export function TransactionExplorer() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { prefs } = usePrefs();
  const { txns } = useLedger();
  const { inspect, inspector } = useUI();
  const [limit, setLimit] = useState(80);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const account = params.get("account") ?? "";
  const type = params.get("type") ?? "all";
  const period = params.get("period") ?? (category || account || q ? "all" : prefs.defaultTxnPeriod);
  const [from, to] = periodRange(period, params.get("from"), params.get("to"));
  const [draft, setDraft] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    // The URL changed from outside (a link elsewhere): adopt it
    setSyncedQ(q);
    if (q !== draft) setDraft(q);
  }

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    setLimit(80);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const needle = q.trim().toLowerCase();
  const rows = txns.filter(
    (t) =>
      t.date >= from &&
      t.date <= to &&
      (!category || t.categoryId === category) &&
      (!account || t.accountId === account || t.counterpartyId === account) &&
      typeMatch(t, type) &&
      (!needle || t.description.toLowerCase().includes(needle) || (t.note ?? "").toLowerCase().includes(needle) || getCategory(t.categoryId).name.toLowerCase().includes(needle)),
  );
  const view = (t: Transaction) => (account ? amountFor(t, account) : t.amount);
  const { sorted, sort, toggle } = useSort(
    rows,
    {
      date: (t) => t.date + t.id,
      description: (t) => t.description.toLowerCase(),
      amount: (t) => view(t),
      category: (t) => getCategory(t.categoryId).name,
    },
    { key: "date", dir: "desc" },
  );

  const counted = rows.filter((t) => account || !isInternal(t));
  const moneyIn = counted.reduce((s, t) => s + Math.max(0, view(t)), 0);
  const moneyOut = counted.reduce((s, t) => s + Math.min(0, view(t)), 0);
  const selectedId = inspector?.kind === "transaction" ? inspector.id : null;
  const activeFilters = [
    category && { key: "category", label: getCategory(category).name },
    account && { key: "account", label: ledgerAccountName(account) },
    q && { key: "q", label: `“${q}”` },
    type !== "all" && { key: "type", label: TYPES.find((x) => x.id === type)?.label ?? type },
  ].filter(Boolean) as { key: string; label: string }[];

  const download = () => {
    const header = ["Date", "Description", "Category", "Account", "Counterparty", "Method", "Type", "Amount (INR)", "Note", "Source"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = sorted.map((t) =>
      [t.date, t.description, getCategory(t.categoryId).name, ledgerAccountName(t.accountId), t.counterpartyId ? ledgerAccountName(t.counterpartyId) : "", t.method, t.type, view(t).toFixed(2), t.note ?? "", t.source].map((v) => esc(String(v))).join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `myfinancespace-transactions-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Transactions"
        meta={`Every account and card in one ledger · ${formatDate(from, "d MMM")} – ${formatDate(to, "d MMM yyyy")}`}
        actions={
          <>
            <button type="button" className="btn" onClick={download} disabled={!rows.length}>
              <Download size={14} aria-hidden /> Download CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => inspect({ kind: "new-transaction", id: "new", preset: account ? { accountId: account } : undefined })}>
              <Plus size={14} strokeWidth={2.4} aria-hidden /> Add transaction
            </button>
          </>
        }
      />

      {/* Filters: one row above the content they scope */}
      <div className="mt-4 flex flex-wrap items-end gap-2 border-y border-rule bg-paper-2/60 px-4 py-2.5 md:px-6">
        <div className="w-full sm:w-64">
          <label className="sr-only" htmlFor="txn-search">
            Search transactions
          </label>
          <input
            id="txn-search"
            className="input"
            placeholder="Search merchant, note or category"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              set({ q: e.target.value || null });
            }}
          />
        </div>
        <select className="select w-auto" aria-label="Period" value={period} onChange={(e) => set({ period: e.target.value, from: null, to: null })}>
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {period === "custom" && (
          <>
            <input type="date" className="input num w-[150px]" aria-label="From date" min={DATA_START_DATE} max={to} value={from} onChange={(e) => set({ from: e.target.value })} />
            <input type="date" className="input num w-[150px]" aria-label="To date" min={from} max={AS_OF} value={to} onChange={(e) => set({ to: e.target.value })} />
          </>
        )}
        <select className="select w-auto max-w-[220px]" aria-label="Account" value={account} onChange={(e) => set({ account: e.target.value || null })}>
          <option value="">All accounts & cards</option>
          {ledgerAccountIds.map((id) => (
            <option key={id} value={id}>
              {ledgerAccountName(id)}
            </option>
          ))}
        </select>
        <select className="select w-auto max-w-[220px]" aria-label="Category" value={category} onChange={(e) => set({ category: e.target.value || null })}>
          <option value="">All categories</option>
          {(["income", "essentials", "lifestyle", "commitments", "transfers"] as const).map((g) => (
            <optgroup key={g} label={g[0].toUpperCase() + g.slice(1)}>
              {CATEGORIES.filter((c) => c.group === g).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select className="select w-auto" aria-label="Type" value={type} onChange={(e) => set({ type: e.target.value === "all" ? null : e.target.value })}>
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 md:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <span key={f.key} className="inline-flex h-6 items-center gap-1 rounded-[3px] bg-pen-wash pr-1 pl-2 text-xs font-medium text-pen">
              {f.label}
              <button
                type="button"
                className="grid size-4 place-items-center rounded-[2px] hover:bg-pen-wash-2"
                onClick={() => {
                  if (f.key === "q") setDraft("");
                  set({ [f.key]: null });
                }}
                aria-label={`Remove filter ${f.label}`}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
          {activeFilters.length > 1 && (
            <button type="button" className="text-xs font-medium text-ink-3 hover:text-ink" onClick={() => (setDraft(""), router.replace(pathname, { scroll: false }))}>
              Clear all
            </button>
          )}
          <span className="text-sm text-ink-3">
            <span className="font-semibold text-ink">{rows.length}</span> transactions
          </span>
        </div>
        <dl className="flex gap-5 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-ink-3">In</dt>
            <dd>
              <Money value={moneyIn} sign="always" tone="flow" className="num font-semibold" />
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-3">Out</dt>
            <dd>
              <Money value={moneyOut} className="num font-semibold" />
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-3">Net</dt>
            <dd>
              <Money value={moneyIn + moneyOut} sign="always" tone="gain" className="num font-semibold" />
            </dd>
          </div>
        </dl>
      </div>
      {!account && rows.some(isInternal) && <p className="-mt-1 px-4 pb-2 text-xs text-ink-3 md:px-6">Transfers between your own accounts and card bill payments are listed but not counted as money in or out.</p>}

      {rows.length === 0 ? (
        <div className="border-t border-rule">
          <EmptyState
            icon={SearchX}
            title="No transactions match these filters"
            body={`Nothing between ${formatDate(from, "d MMM")} and ${formatDate(to, "d MMM yyyy")} fits. Widen the period or remove a filter.`}
            action={
              <button type="button" className="btn" onClick={() => (setDraft(""), router.replace(`${pathname}?period=all`, { scroll: false }))}>
                Show all transactions
              </button>
            }
          />
        </div>
      ) : (
        <>
        <ul className="border-t border-rule md:hidden" aria-label="Transactions">
          {sorted.slice(0, limit).map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => inspect({ kind: "transaction", id: t.id })} className={cx("flex w-full items-center gap-3 border-b border-rule px-4 py-2.5 text-left", selectedId === t.id && "bg-pen-wash")}>
                <DateMark date={t.date} className="w-[48px] shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-sm", t.source === "manual" ? "text-pen" : "text-ink")}>{t.description}</span>
                  <span className="block truncate text-xs text-ink-3">
                    {getCategory(t.categoryId).name} · {ledgerAccountShort(t.accountId)}
                  </span>
                </span>
                <Money value={view(t)} tone="flow" className="num text-sm font-medium" />
              </button>
            </li>
          ))}
        </ul>
        <TableWrap className="hidden @container md:block">
          <table className="tbl min-w-[640px]">
            <thead>
              <tr>
                <SortTh k="date" sort={sort} onSort={toggle} className="w-[88px]">
                  Date
                </SortTh>
                <SortTh k="description" sort={sort} onSort={toggle}>
                  Description
                </SortTh>
                <SortTh k="category" sort={sort} onSort={toggle} className="w-[190px]">
                  Category
                </SortTh>
                <th className="w-[170px]">Account</th>
                <th className="hidden w-[90px] @4xl:table-cell">Method</th>
                <SortTh k="amount" sort={sort} onSort={toggle} align="right" className="w-[130px]">
                  Amount
                </SortTh>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, limit).map((t) => {
                const amt = view(t);
                return (
                  <tr key={t.id} data-clickable="true" aria-selected={selectedId === t.id} onClick={() => inspect({ kind: "transaction", id: t.id })}>
                    <td>
                      <DateMark date={t.date} />
                    </td>
                    <td className="max-w-0">
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-center gap-2 text-left focus-visible:outline-offset-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          inspect({ kind: "transaction", id: t.id });
                        }}
                      >
                        <span className={cx("truncate", t.source === "manual" ? "text-pen" : "text-ink")}>{t.description}</span>
                        {t.source === "manual" && (
                          <Tag tone="pen">
                            <PenLine size={10} aria-hidden /> yours
                          </Tag>
                        )}
                        {t.note && <StickyNote size={12} className="shrink-0 text-ink-3" aria-label="Has a note" />}
                      </button>
                      {t.counterpartyId && <span className="block truncate text-xs text-ink-3">to {ledgerAccountShort(t.counterpartyId)}</span>}
                    </td>
                    <td className="truncate text-ink-2">{getCategory(t.categoryId).name}</td>
                    <td className="truncate text-ink-2">
                      {ledgerAccountShort(t.accountId)}
                      {getCard(t.accountId) && <span className="text-ink-3"> ••{getCard(t.accountId)!.mask}</span>}
                    </td>
                    <td className="hidden text-ink-3 @4xl:table-cell">{t.method}</td>
                    <td className="r">
                      <Money value={amt} tone="flow" className="num font-medium" decimals={prefs.showPaise ? 2 : 0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
          {sorted.length > limit && (
            <div className="flex items-center justify-center gap-3 border-b border-rule py-3 text-sm text-ink-3">
              Showing {limit} of {sorted.length}
              <button type="button" className="btn btn-sm" onClick={() => setLimit((l) => l + 120)}>
                Show more
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setLimit(sorted.length)}>
                Show all
              </button>
            </div>
          )}
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {rows.length} transactions, money in {formatMoney(moneyIn)}, money out {formatMoney(moneyOut)}
      </p>
    </div>
  );
}
