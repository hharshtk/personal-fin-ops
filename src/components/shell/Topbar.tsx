"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, ChevronRight, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { activeNav } from "./nav";
import { useTheme } from "./theme";
import { useLedger, usePrefs, useUI } from "@/components/workspace/state";
import { attentionItems, entityHref, getAccount, getCard, getLoan, PROFILE, AS_OF } from "@/lib/data";
import { formatDate, fyLabel } from "@/lib/format";
import { SeverityIcon } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";
import type { AttentionItem } from "@/lib/types";

function crumbFor(pathname: string): { label: string; href?: string }[] {
  const nav = activeNav(pathname);
  if (!nav) return [{ label: "Not found" }];
  const crumbs: { label: string; href?: string }[] = [{ label: nav.label, href: nav.href }];
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length > 1) {
    const id = decodeURIComponent(seg[1]);
    const name = getAccount(id)?.name ?? getCard(id)?.name ?? getLoan(id)?.name;
    crumbs.push({ label: name ?? id });
  }
  return crumbs;
}

export function useAttentionAction() {
  const { inspect } = useUI();
  const router = useRouter();
  return (item: AttentionItem) => {
    if (item.ref.kind === "category") router.push(entityHref(item.ref) + "&period=month");
    else inspect(item.ref);
  };
}

function AttentionMenu() {
  const [open, setOpen] = useState(false);
  const { txns, paidOccurrences } = useLedger();
  const { prefs } = usePrefs();
  const items = attentionItems(txns, paidOccurrences, prefs.billReminderDays);
  const critical = items.filter((i) => i.severity === "critical").length;
  const act = useAttentionAction();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // Close when this route is hidden by Activity
  useLayoutEffect(() => () => setOpen(false), []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-icon relative"
        aria-label={`Needs attention: ${items.length} items${critical ? `, ${critical} critical` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={17} strokeWidth={1.9} aria-hidden />
        {items.length > 0 && (
          <span
            className={cx(
              "absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white",
              critical ? "bg-red" : "bg-ink-2",
            )}
            aria-hidden
          >
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="anim-pop absolute top-full right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-md border border-rule-2 bg-paper shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <span className="section-title">Needs attention</span>
            <Link href="/" className="text-xs font-medium text-pen hover:underline" onClick={() => setOpen(false)}>
              Open overview
            </Link>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="border-b border-rule last:border-0">
                <button
                  type="button"
                  className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-paper-2"
                  onClick={() => {
                    setOpen(false);
                    act(it);
                  }}
                >
                  <span className="mt-0.5">
                    <SeverityIcon severity={it.severity} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{it.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-3">{it.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const crumbs = crumbFor(pathname);
  const { setPaletteOpen, setNavOpen, inspect } = useUI();
  const { resolved, toggle } = useTheme();
  const { prefs } = usePrefs();

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-rule bg-paper/95 px-2 backdrop-blur-[2px] md:px-4" data-noprint>
      <button type="button" className="btn btn-ghost btn-icon md:hidden" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
        <Menu size={18} aria-hidden />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          <li className="hidden shrink-0 text-ink-3 lg:block">
            <Link href="/" className="hover:text-ink">
              Arthashala
            </Link>
          </li>
          {crumbs.map((c, i) => (
            <li key={i} className={cx("flex min-w-0 items-center gap-1", i === 0 && "max-lg:[&>svg]:hidden")}>
              <ChevronRight size={14} className="shrink-0 text-ink-3" aria-hidden />
              {c.href && i < crumbs.length - 1 ? (
                <Link href={c.href} className="truncate text-ink-3 hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate font-semibold text-ink" aria-current="page">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden h-8 w-[300px] items-center gap-2 rounded-[3px] border border-rule-2 bg-paper-2 px-2.5 text-sm text-ink-3 transition-colors hover:border-ink-3 hover:text-ink-2 lg:flex"
        aria-label="Search or jump to (Ctrl K)"
      >
        <Search size={15} aria-hidden />
        <span className="flex-1 text-left">Search accounts, bills, transactions…</span>
        <span className="kbd">Ctrl K</span>
      </button>
      <button type="button" onClick={() => setPaletteOpen(true)} className="btn btn-ghost btn-icon lg:hidden" aria-label="Search">
        <Search size={17} aria-hidden />
      </button>

      <span
        className="hidden h-8 items-center rounded-[3px] px-2 text-xs whitespace-nowrap text-ink-3 xl:inline-flex"
        title="All figures are demonstration data, fixed at this date"
      >
        {fyLabel(AS_OF, prefs.fyStartMonth)} · as of&nbsp;<span className="font-semibold text-ink-2">{formatDate(AS_OF, "d MMM yyyy")}</span>
      </span>

      <button type="button" className="btn btn-primary hidden sm:inline-flex" onClick={() => inspect({ kind: "new-transaction", id: "new" })} title="Add transaction (N)">
        <Plus size={15} strokeWidth={2.4} aria-hidden />
        Add
      </button>
      <button type="button" className="btn btn-primary btn-icon sm:hidden" onClick={() => inspect({ kind: "new-transaction", id: "new" })} aria-label="Add transaction">
        <Plus size={16} strokeWidth={2.4} aria-hidden />
      </button>

      <AttentionMenu />

      <button type="button" className="btn btn-ghost btn-icon" onClick={toggle} aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
        {resolved === "dark" ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
      </button>
      <Link
        href="/settings"
        className="ml-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-paper-3 text-[11px] font-bold text-ink-2 hover:bg-pen-wash hover:text-pen"
        aria-label={`${PROFILE.name}: settings`}
        title={PROFILE.name}
      >
        {PROFILE.initials}
      </Link>
    </header>
  );
}
