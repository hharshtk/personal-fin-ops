import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AccountDetail } from "@/components/views/Accounts";
import { DetailSkeleton } from "@/components/ui/DetailSkeleton";
import { CASH_ACCOUNTS } from "@/lib/data";

export function generateStaticParams() {
  return CASH_ACCOUNTS.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: PageProps<"/accounts/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: CASH_ACCOUNTS.find((a) => a.id === id)?.name ?? "Account" };
}

async function Account({ params }: { params: PageProps<"/accounts/[id]">["params"] }) {
  const { id } = await params;
  if (!CASH_ACCOUNTS.some((a) => a.id === id)) notFound();
  return <AccountDetail id={id} />;
}

export default function Page({ params }: PageProps<"/accounts/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Account params={params} />
    </Suspense>
  );
}
