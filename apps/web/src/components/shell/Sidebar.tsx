"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { NAV, SETTINGS_ITEM, activeNav, type NavItem } from "./nav";
import { useRail } from "./theme";
import { useUI } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";
import { formatDate } from "@myfinancespace/core/format";
import { AS_OF } from "@myfinancespace/core/data";

function Wordmark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/" className="flex h-12 items-center gap-2.5 rounded-sm px-1.5 text-rail-ink" aria-label="MyFinanceSpace overview">
      <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-[3px] bg-pen text-paper">
        <span className="daynum text-[15px]">22</span>
      </span>
      {!collapsed && <span className="text-[15px] font-[650] tracking-[-0.01em]">MyFinanceSpace</span>}
    </Link>
  );
}

function NavLink({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onNavigate={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cx(
        "group relative flex h-8 items-center gap-2.5 rounded-[3px] px-2 text-[13.5px] font-medium transition-colors",
        active ? "bg-paper text-ink shadow-[0_1px_2px_rgb(20_24_40/0.08)] ring-1 ring-rule" : "text-rail-ink hover:bg-rail-hover",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon size={16} strokeWidth={active ? 2.2 : 1.9} aria-hidden className={cx("shrink-0", active ? "text-pen" : "text-rail-ink-2 group-hover:text-rail-ink")} />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const active = activeNav(pathname);
  const { collapsed, toggle } = useRail();
  const { navOpen, setNavOpen } = useUI();
  const close = () => setNavOpen(false);

  const body = (isDrawer: boolean) => {
    const c = collapsed && !isDrawer;
    return (
      <div className="flex h-full flex-col">
        <div className={cx("flex items-center justify-between px-2.5", c && "justify-center")}>
          <Wordmark collapsed={c} />
          {isDrawer && (
            <button type="button" onClick={close} className="btn btn-ghost btn-icon text-rail-ink hover:bg-rail-hover" aria-label="Close navigation">
              <X size={18} />
            </button>
          )}
        </div>
        <nav aria-label="Workspaces" className="flex-1 overflow-y-auto px-2.5 pt-2 pb-4">
          {NAV.map((group, gi) => (
            <div key={gi} className={cx(gi > 0 && "mt-4")}>
              {group.label &&
                (c ? (
                  <div className="mx-2 mb-2 h-px bg-rail-rule" aria-hidden />
                ) : (
                  <div className="mb-1 px-2 text-xs font-medium text-rail-ink-2">{group.label}</div>
                ))}
              <ul className="space-y-px">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={active?.href === item.href} collapsed={c} onNavigate={isDrawer ? close : undefined} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-rail-rule px-2.5 py-2.5">
          <NavLink item={SETTINGS_ITEM} active={active?.href === SETTINGS_ITEM.href} collapsed={c} onNavigate={isDrawer ? close : undefined} />
          {!c && (
            <p className="mt-2 px-2 text-xs leading-snug text-rail-ink-2">
              Demonstration data
              <br />
              as of {formatDate(AS_OF, "d MMM yyyy")}
            </p>
          )}
          {!isDrawer && (
            <button
              type="button"
              onClick={toggle}
              className={cx("mt-2 flex h-8 w-full items-center gap-2.5 rounded-[3px] px-2 text-[13px] text-rail-ink-2 hover:bg-rail-hover hover:text-rail-ink", c && "justify-center px-0")}
              aria-label={c ? "Expand navigation" : "Collapse navigation"}
              title={c ? "Expand navigation ( [ )" : undefined}
            >
              {c ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
              {!c && (
                <span className="flex flex-1 items-center justify-between">
                  Collapse <span className="kbd border-rail-rule bg-transparent text-rail-ink-2">[</span>
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={cx(
          "sticky top-0 z-30 hidden h-dvh shrink-0 border-r border-rail-rule bg-rail transition-[width] duration-150 md:block",
          collapsed ? "w-[60px]" : "w-[228px]",
        )}
      >
        {body(false)}
      </aside>
      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="anim-fade absolute inset-0 bg-ink/40" onClick={close} aria-label="Close navigation" tabIndex={-1} />
          <aside className="anim-inspector absolute inset-y-0 left-0 w-[264px] bg-rail shadow-[var(--shadow-pop)]">{body(true)}</aside>
        </div>
      )}
    </>
  );
}
