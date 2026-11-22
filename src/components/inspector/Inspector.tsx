"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { useUI } from "@/components/workspace/state";
import { cx } from "@/components/ui/cx";
import {
  AccountInspector,
  AssetInspector,
  CardInspector,
  CategoryInspector,
  GoalInspector,
  HoldingInspector,
  LoanInspector,
  OccurrenceInspector,
  PolicyInspector,
  TransactionInspector,
} from "./panels";
import { TransactionForm } from "./TransactionForm";

const KIND_LABEL: Record<string, string> = {
  account: "Account",
  card: "Credit card",
  loan: "Loan",
  holding: "Holding",
  asset: "Asset",
  policy: "Insurance policy",
  goal: "Goal",
  commitment: "Bill",
  transaction: "Transaction",
  category: "Category",
  "new-transaction": "New transaction",
  "edit-transaction": "Edit transaction",
};

export function Inspector() {
  const { inspector, closeInspector, inspectorBack, canGoBack } = useUI();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastPath = useRef(pathname);

  // Close when the user moves to another workspace
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      closeInspector();
    }
  }, [pathname, closeInspector]);

  useEffect(() => {
    if (!inspector) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target as HTMLElement)?.closest?.("[data-palette]")) {
        closeInspector();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspector, closeInspector]);

  // Move focus into the panel when it opens or changes subject
  const key = inspector ? `${inspector.kind}:${inspector.id}` : "";
  useEffect(() => {
    if (key) panelRef.current?.focus({ preventScroll: true });
  }, [key]);

  if (!inspector) return null;

  let body: React.ReactNode;
  switch (inspector.kind) {
    case "transaction":
      body = <TransactionInspector id={inspector.id} />;
      break;
    case "account":
      body = <AccountInspector id={inspector.id} />;
      break;
    case "card":
      body = <CardInspector id={inspector.id} />;
      break;
    case "loan":
      body = <LoanInspector id={inspector.id} />;
      break;
    case "holding":
      body = <HoldingInspector id={inspector.id} />;
      break;
    case "asset":
      body = <AssetInspector id={inspector.id} />;
      break;
    case "policy":
      body = <PolicyInspector id={inspector.id} />;
      break;
    case "goal":
      body = <GoalInspector id={inspector.id} />;
      break;
    case "commitment":
      body = <OccurrenceInspector id={inspector.id} />;
      break;
    case "category":
      body = <CategoryInspector id={inspector.id} />;
      break;
    case "new-transaction":
      body = <TransactionForm key={`new-${JSON.stringify(inspector.preset ?? {})}`} preset={inspector.preset} />;
      break;
    case "edit-transaction":
      body = <TransactionForm key={`edit-${inspector.id}`} editId={inspector.id} />;
      break;
    default:
      body = null;
  }

  return (
    <>
      {/* Scrim on narrower screens, where the inspector overlays the workspace */}
      <button type="button" aria-label="Close panel" tabIndex={-1} className="anim-fade fixed inset-0 z-30 bg-ink/25 xl:hidden" onClick={closeInspector} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-label={KIND_LABEL[inspector.kind] ?? "Details"}
        className={cx(
          "anim-inspector fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-rule-2 bg-paper shadow-[var(--shadow-pop)] outline-none",
          "xl:sticky xl:top-12 xl:z-10 xl:h-[calc(100dvh-48px)] xl:w-[400px] xl:shrink-0 xl:shadow-none",
        )}
      >
        <div className="flex h-11 shrink-0 items-center gap-1 border-b border-rule px-2">
          {canGoBack && (
            <button type="button" onClick={inspectorBack} className="btn btn-ghost btn-sm btn-icon" aria-label="Back">
              <ArrowLeft size={16} aria-hidden />
            </button>
          )}
          <span className="flex-1 truncate px-2 text-xs font-semibold text-ink-3">{KIND_LABEL[inspector.kind] ?? "Details"}</span>
          <span className="kbd mr-1 hidden xl:inline-flex" aria-hidden>
            Esc
          </span>
          <button type="button" onClick={closeInspector} className="btn btn-ghost btn-sm btn-icon" aria-label="Close panel">
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </aside>
    </>
  );
}
