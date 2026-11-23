"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, CircleAlert, MessageCircle, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { ALL_NAV } from "./nav";
import { useRail, useTheme } from "./theme";
import { Inspector } from "@/components/inspector/Inspector";
import { useUI, WorkspaceProvider } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";

const CHAT_PANEL_ID = "workspace-chat";
const ChatPanel = dynamic(() => import("@/components/chat/ChatPanel").then((module) => module.ChatPanel), { ssr: false });

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

function KeyboardShortcuts({ inspectorModal }: { inspectorModal: boolean }) {
  const router = useRouter();
  const { setPaletteOpen, paletteOpen, inspect, setShortcutsOpen } = useUI();
  const rail = useRail();
  const theme = useTheme();
  const chord = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inspectorModal || document.querySelector("dialog:modal")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }
      if (paletteOpen || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest(`#${CHAT_PANEL_ID}`)) return;
      const k = e.key.toLowerCase();
      const now = Date.now();
      if (chord.current && now - chord.current.at < 1200 && chord.current.key === "g") {
        chord.current = null;
        const target = ALL_NAV.find((n) => n.key === k);
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (k === "g") {
        chord.current = { key: "g", at: now };
        return;
      }
      if (k === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (k === "n") {
        e.preventDefault();
        inspect({ kind: "new-transaction", id: "new" });
      } else if (k === "[") {
        rail.toggle();
      } else if (e.key === "?") {
        setShortcutsOpen(true);
      } else if (e.shiftKey && k === "d") {
        theme.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, paletteOpen, setPaletteOpen, inspect, rail, theme, setShortcutsOpen, inspectorModal]);

  return null;
}

function Toasts() {
  const { toasts, dismissToast } = useUI();
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex w-[min(420px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-2" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className="anim-toast pointer-events-auto flex items-center gap-3 rounded-md bg-ink px-3.5 py-2.5 text-sm text-paper shadow-[var(--shadow-pop)]">
          {t.tone === "critical" ? <CircleAlert size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden className="opacity-80" />}
          <span className="min-w-0 flex-1">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="rounded-[3px] px-2 py-1 text-sm font-semibold text-pen-wash-2 hover:bg-white/10"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="rounded-[3px] p-1 opacity-70 hover:bg-white/10 hover:opacity-100" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

const SHORTCUTS: [string[], string][] = [
  [["Ctrl", "K"], "Search and commands"],
  [["/"], "Search and commands"],
  [["N"], "Add a transaction"],
  [["Esc"], "Close the panel or search"],
  [["["], "Collapse or expand navigation"],
  [["Shift", "D"], "Switch light / dark theme"],
  [["?"], "Show this list"],
];

function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useUI();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (shortcutsOpen && !d.open) d.showModal();
    if (!shortcutsOpen && d.open) d.close();
  }, [shortcutsOpen]);
  return (
    <dialog
      ref={ref}
      onClose={() => setShortcutsOpen(false)}
      onClick={(e) => e.target === ref.current && setShortcutsOpen(false)}
      className="anim-pop m-auto w-[min(560px,calc(100vw-24px))] rounded-md border border-rule-2 bg-paper p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/35"
      aria-labelledby="shortcuts-title"
    >
      <div className="flex items-center justify-between border-b border-rule px-5 py-3">
        <h2 id="shortcuts-title" className="section-title">
          Keyboard shortcuts
        </h2>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setShortcutsOpen(false)} aria-label="Close">
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="grid gap-x-8 px-5 py-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-ink-3">General</h3>
          <ul className="space-y-2">
            {SHORTCUTS.map(([keys, label]) => (
              <li key={label + keys.join()} className="flex items-center justify-between gap-3 text-sm">
                <span>{label}</span>
                <span className="flex gap-1">
                  {keys.map((k) => (
                    <span key={k} className="kbd">
                      {k}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 sm:mt-0">
          <h3 className="mb-2 text-xs font-semibold text-ink-3">Go to (press G, then)</h3>
          <ul className="space-y-2">
            {ALL_NAV.map((n) => (
              <li key={n.href} className="flex items-center justify-between gap-3 text-sm">
                <span>{n.label}</span>
                <span className="kbd">{n.key.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </dialog>
  );
}

// Match the inspector's xl breakpoint, where it switches from overlay to side panel.
const inspectorOverlay = () => window.matchMedia("(width < 80rem)");
function subscribeInspectorOverlay(callback: () => void) {
  const query = inspectorOverlay();
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function Frame({ children }: { children: ReactNode }) {
  const { inspector, navOpen, paletteOpen } = useUI();
  const [chatOpen, setChatOpen] = useState<boolean | null>(null);
  const chatPanelId = chatOpen === null ? undefined : CHAT_PANEL_ID;
  const overlay = useSyncExternalStore(subscribeInspectorOverlay, () => inspectorOverlay().matches, () => false);
  const inspectorModal = overlay && (inspector?.kind.includes("equity") ?? false);
  // From xl the inspector is a 400px column on the right edge with its actions at the bottom.
  // Dock the launcher and chat just left of it so they never cover Save.
  const chatDock = inspector ? "xl:right-[calc(400px+1rem)]" : undefined;
  return (
    <div className="flex min-h-dvh bg-paper">
      <a href="#main" inert={inspectorModal} className="sr-only z-[80] rounded-[3px] bg-pen px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <div className="contents" inert={inspectorModal}>
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="contents" inert={inspectorModal}><Topbar /></div>
        <div className="flex min-w-0 flex-1">
          <main id="main" inert={inspectorModal} className={cx("min-w-0 flex-1 pb-16", inspector && "xl:pr-0")}>
            {children}
          </main>
          <Inspector modal={inspectorModal} />
        </div>
      </div>
      <button
        type="button"
        data-noprint
        inert={navOpen || paletteOpen || (overlay && !!inspector)}
        className={cx(
          "btn btn-primary btn-icon fixed top-[calc(100dvh-max(1rem,env(safe-area-inset-bottom)))] left-[calc(100vw-1rem)] z-[25] size-12 -translate-full rounded-full shadow-[var(--shadow-pop)]",
          "md:top-auto md:right-4 md:bottom-4 md:left-auto md:translate-none",
          chatDock,
        )}
        aria-label="Ask AI"
        title={chatOpen ? "Close Ask AI" : "Ask AI"}
        aria-haspopup="dialog"
        aria-controls={chatPanelId}
        aria-expanded={chatOpen === true}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          setChatOpen((open) => !open);
        }}
      >
        {chatOpen ? <ChevronDown size={24} aria-hidden /> : <MessageCircle size={22} aria-hidden />}
      </button>
      {chatOpen !== null && <ChatPanel id={CHAT_PANEL_ID} open={chatOpen} dockClassName={chatDock} onClose={() => setChatOpen(false)} />}
      <CommandPalette />
      <ShortcutsDialog />
      <Toasts />
      <KeyboardShortcuts inspectorModal={inspectorModal} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <Frame>{children}</Frame>
    </WorkspaceProvider>
  );
}
