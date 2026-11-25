import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CreditCardsView } from "@/components/views/CreditCards";
import { DetailSkeleton } from "@/components/ui/DetailSkeleton";
import { CARDS, getCard } from "@myfinancespace/core/data";

export function generateStaticParams() {
  return CARDS.map((card) => ({ id: card.id }));
}

export async function generateMetadata({ params }: PageProps<"/credit-cards/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getCard(id)?.name ?? "Credit cards" };
}

async function Card({ params }: Pick<PageProps<"/credit-cards/[id]">, "params">) {
  const { id } = await params;
  if (!getCard(id)) notFound();
  return <CreditCardsView id={id} />;
}

export default function Page({ params }: PageProps<"/credit-cards/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Card params={params} />
    </Suspense>
  );
}
