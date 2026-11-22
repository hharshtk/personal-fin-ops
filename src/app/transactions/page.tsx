import type { Metadata } from "next";
import { Suspense } from "react";
import { TransactionExplorer } from "@/components/views/Transactions";
import { PageHeader, TableSkeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Transactions" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader title="Transactions" meta="Loading your ledger…" />
          <div className="mt-4 h-[54px] border-y border-rule bg-paper-2/60" />
          <div className="mt-4">
            <TableSkeleton rows={12} cols={6} />
          </div>
        </div>
      }
    >
      <TransactionExplorer />
    </Suspense>
  );
}
