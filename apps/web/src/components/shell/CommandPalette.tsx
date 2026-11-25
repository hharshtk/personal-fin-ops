"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesCombined,
  CornerDownLeft,
  CreditCard,
  Flag,
  Keyboard,
  Landmark,
  Moon,
  PanelLeftClose,
  Plus,
  Rows3,
  Scale,
  Search,
  SearchX,
  ShieldCheck,
  Tag as TagIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ALL_NAV } from "./nav";
import { useDensity, useRail, useTheme } from "./theme";
import { useLedger, useUI, type InspectTarget } from "@/components/workspace/state";
import {
  ASSETS,
  CARDS,
  CASH_ACCOUNTS,
  CATEGORIES,
  COMMITMENTS,
  GOALS,
  HOLDINGS,
  LOANS,
  OCCURRENCES,
  POLICIES,
  ledgerAccountName,
  loanStatus,
  cardStatus,
  entityHref,
  AS_OF,
} from "@myfinancespace/core/data";
import { formatDate, formatMoney } from "@myfinancespace/core/format";
import { cx } from "@/components/ui/cx";

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: LucideIcon;
  shortcut?: string[];
  run: () => void;
}

function score(c: Cmd, q: string): number {
  if (!q) return 1;
  const hay = `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase();
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.every((t) => hay.includes(t))) return 0;
  const label = c.label.toLowerCase();
  if (label.startsWith(tokens[0])) return 3;
  if (label.split(/[\s·]+/).some((w) => w.startsWith(tokens[0]))) return 2;
  return 1;
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, inspect, setShortcutsOpen } = useUI();
  const { txns } = useLedger();
  const router = useRouter();
  const theme = useTheme();
  const density = useDensity();
  const rail = useRail();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = () => {
    setPaletteOpen(false);
    setQ("");
    setActive(0);
  };

  const open = (t: InspectTarget) => () => inspect(t);

  const commands = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [];
    list.push(
      { id: "act-add", group: "Actions", label: "Add a transaction", icon: Plus, shortcut: ["N"], run: () => inspect({ kind: "new-transaction", id: "new" }) },
      { id: "act-theme", group: "Actions", label: "Switch light / dark theme", keywords: "appearance dark mode", icon: Moon, run: theme.toggle },
      { id: "act-density", group: "Actions", label: density.density === "compact" ? "Use comfortable rows" : "Use compact rows", keywords: "density table rows", icon: Rows3, run: () => density.setDensity(density.density === "compact" ? "comfortable" : "compact") },
      { id: "act-rail", group: "Actions", label: rail.collapsed ? "Expand navigation" : "Collapse navigation", keywords: "sidebar", icon: PanelLeftClose, shortcut: ["["], run: rail.toggle },
      { id: "act-keys", group: "Actions", label: "Keyboard shortcuts", icon: Keyboard, shortcut: ["?"], run: () => setShortcutsOpen(true) },
    );
    for (const n of ALL_NAV) {
      list.push({ id: `nav-${n.href}`, group: "Go to", label: n.label, keywords: n.keywords, icon: n.icon, shortcut: ["G", n.key.toUpperCase()], run: () => router.push(n.href) });
    }
    for (const a of CASH_ACCOUNTS) {
      list.push({ id: `acc-${a.id}`, group: "Accounts", label: ledgerAccountName(a.id), hint: formatMoney(a.balance), keywords: `${a.institution} ${a.role} ${a.kind}`, icon: Landmark, run: open({ kind: "account", id: a.id }) });
    }
    for (const c of CARDS) {
      list.push({ id: `card-${c.id}`, group: "Cards & loans", label: ledgerAccountName(c.id), hint: `${formatMoney(cardStatus(c.id, txns).outstanding)} owed`, keywords: `credit card ${c.institution}`, icon: CreditCard, run: () => router.push(entityHref({ kind: "card", id: c.id })) });
    }
    for (const l of LOANS) {
      list.push({ id: `loan-${l.id}`, group: "Cards & loans", label: `${l.name} · ${l.lender}`, hint: `${formatMoney(loanStatus(l.id).outstanding)} outstanding`, keywords: `loan emi ${l.kind}`, icon: Landmark, run: open({ kind: "loan", id: l.id }) });
    }
    for (const h of HOLDINGS) {
      list.push({ id: `h-${h.id}`, group: "Investments", label: h.name, hint: formatMoney(h.current), keywords: `${h.symbol ?? ""} ${h.type} ${h.platform} ${h.assetClass}`, icon: ChartNoAxesCombined, run: open({ kind: "holding", id: h.id }) });
    }
    for (const g of GOALS) list.push({ id: `g-${g.id}`, group: "Goals", label: g.name, hint: `target ${formatMoney(g.target, { compact: true })}`, keywords: "goal", icon: Flag, run: open({ kind: "goal", id: g.id }) });
    for (const p of POLICIES) list.push({ id: `p-${p.id}`, group: "Insurance", label: `${p.insurer} ${p.name}`, hint: `renews ${formatDate(p.renewsOn, "d MMM yyyy")}`, keywords: `insurance policy ${p.kind} ${p.insured}`, icon: ShieldCheck, run: open({ kind: "policy", id: p.id }) });
    for (const a of ASSETS) list.push({ id: `as-${a.id}`, group: "Assets", label: a.name, hint: formatMoney(a.currentValue, { compact: true }), keywords: `${a.kind} ${a.detail}`, icon: Scale, run: open({ kind: "asset", id: a.id }) });
    for (const c of COMMITMENTS) {
      const next = OCCURRENCES.find((o) => o.commitmentId === c.id && o.date >= AS_OF) ?? OCCURRENCES.find((o) => o.commitmentId === c.id);
      if (next) list.push({ id: `c-${c.id}`, group: "Bills & commitments", label: c.name, hint: `${formatDate(next.date, "d MMM")} · ${formatMoney(next.amount)}`, keywords: `bill ${c.kind} ${c.cadence}`, icon: CalendarDays, run: open({ kind: "commitment", id: next.id }) });
    }
    for (const c of CATEGORIES.filter((c) => c.budget || c.group === "income")) {
      list.push({ id: `cat-${c.id}`, group: "Categories", label: c.name, hint: "transactions", keywords: "category spending", icon: TagIcon, run: () => router.push(`/transactions?category=${c.id}&period=all`) });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txns, theme.resolved, density.density, rail.collapsed]);

  const results = useMemo(() => {
    const query = q.trim();
    const ranked = commands
      .map((c) => ({ c, s: score(c, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s);
    let list = ranked.map((r) => r.c);
    if (!query) list = list.filter((c) => c.group === "Actions" || c.group === "Go to");
    if (query.length >= 2) {
      const t = txns
        .filter((x) => x.description.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
        .map<Cmd>((x) => ({
          id: `t-${x.id}`,
          group: "Transactions",
          label: x.description,
          hint: `${formatDate(x.date, "d MMM")} · ${formatMoney(x.amount, { sign: "always" })}`,
          icon: ArrowLeftRight,
          run: () => inspect({ kind: "transaction", id: x.id }),
        }));
      list = [...list.slice(0, 18), ...t];
    }
    // keep groups contiguous in first-seen order
    const order: string[] = [];
    list.forEach((c) => !order.includes(c.group) && order.push(c.group));
    return order.flatMap((g) => list.filter((c) => c.group === g));
  }, [q, commands, txns, inspect]);

  useEffect(() => {
    if (paletteOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [paletteOpen]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!paletteOpen) return null;

  const run = (c: Cmd) => {
    close();
    c.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) run(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  let lastGroup = "";
  const rows: ReactNode[] = [];
  results.forEach((c, i) => {
    if (c.group !== lastGroup) {
      lastGroup = c.group;
      rows.push(
        <li key={`g-${c.group}`} role="presentation" className="px-3 pt-3 pb-1 text-xs font-semibold text-ink-3">
          {c.group}
        </li>,
      );
    }
    const Icon = c.icon;
    rows.push(
      <li
        key={c.id}
        id={`cmd-${i}`}
        role="option"
        aria-selected={i === active}
        data-index={i}
        onMouseMove={() => setActive(i)}
        onClick={() => run(c)}
        className={cx("mx-1.5 flex h-9 cursor-pointer items-center gap-3 rounded-[3px] px-2.5 text-sm", i === active ? "bg-pen-wash text-ink" : "text-ink-2")}
      >
        <Icon size={15} className={i === active ? "text-pen" : "text-ink-3"} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-ink">{c.label}</span>
        {c.hint && <span className="num shrink-0 text-xs text-ink-3">{c.hint}</span>}
        {c.shortcut && (
          <span className="flex shrink-0 gap-1">
            {c.shortcut.map((k, ki) => (
              <span key={ki} className="kbd">
                {k}
              </span>
            ))}
          </span>
        )}
        {i === active && <CornerDownLeft size={13} className="shrink-0 text-ink-3" aria-hidden />}
      </li>,
    );
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[12vh]" data-palette>
      <button type="button" className="anim-fade absolute inset-0 bg-ink/35" onClick={close} aria-label="Close search" tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-label="Search and commands" className="anim-pop relative w-full max-w-[620px] overflow-hidden rounded-md border border-rule-2 bg-paper shadow-[var(--shadow-pop)]">
        <div className="flex h-12 items-center gap-2.5 border-b border-rule px-4">
          <Search size={17} className="text-ink-3" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Search accounts, holdings, bills, transactions, or jump to a workspace"
            className="h-full flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
            aria-activedescendant={results[active] ? `cmd-${active}` : undefined}
            aria-autocomplete="list"
          />
          <span className="kbd">Esc</span>
        </div>
        <ul id="cmd-list" ref={listRef} role="listbox" className="max-h-[min(440px,60vh)] overflow-y-auto pb-2">
          {rows.length ? (
            rows
          ) : (
            <li className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-ink-3">
              <SearchX size={20} aria-hidden />
              Nothing matches “{q}”. Try a bank, a fund, a merchant or a bill name.
            </li>
          )}
        </ul>
        <div className="flex items-center gap-4 border-t border-rule px-4 py-2 text-xs text-ink-3">
          <span className="flex items-center gap-1">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> move
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">Enter</span> open
          </span>
          <span className="ml-auto">Entities open beside your current work</span>
        </div>
      </div>
    </div>
  );
}
