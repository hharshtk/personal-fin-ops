import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CardDetail, LoanDetail } from "@/components/views/Liabilities";
import { DetailSkeleton } from "@/components/ui/DetailSkeleton";
import { CARDS, LOANS } from "@/lib/data";

export function generateStaticParams() {
  return [...LOANS.map((l) => ({ id: l.id })), ...CARDS.map((c) => ({ id: c.id }))];
}

export async function generateMetadata({ params }: PageProps<"/liabilities/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: LOANS.find((l) => l.id === id)?.name ?? CARDS.find((c) => c.id === id)?.name ?? "Liability" };
}

async function Liability({ params }: { params: PageProps<"/liabilities/[id]">["params"] }) {
  const { id } = await params;
  if (LOANS.some((l) => l.id === id)) return <LoanDetail id={id} />;
  if (CARDS.some((c) => c.id === id)) return <CardDetail id={id} />;
  notFound();
}

export default function Page({ params }: PageProps<"/liabilities/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Liability params={params} />
    </Suspense>
  );
}
