import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoanDetail } from "@/components/views/Liabilities";
import { DetailSkeleton } from "@/components/ui/DetailSkeleton";
import { getLoan, LOANS } from "@myfinancespace/core/data";

export function generateStaticParams() {
  return LOANS.map((loan) => ({ id: loan.id }));
}

export async function generateMetadata({ params }: PageProps<"/liabilities/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getLoan(id)?.name ?? "Liability" };
}

async function Liability({ params }: { params: PageProps<"/liabilities/[id]">["params"] }) {
  const { id } = await params;
  if (getLoan(id)) return <LoanDetail id={id} />;
  notFound();
}

export default function Page({ params }: PageProps<"/liabilities/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Liability params={params} />
    </Suspense>
  );
}
