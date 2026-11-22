import type { Metadata } from "next";
import { Suspense } from "react";
import { InvestmentsView } from "@/components/views/Investments";
import { PageHeader, TableSkeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Investments" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader title="Investments" meta="Loading holdings…" />
          <div className="mt-6">
            <TableSkeleton rows={10} cols={7} />
          </div>
        </div>
      }
    >
      <InvestmentsView />
    </Suspense>
  );
}
