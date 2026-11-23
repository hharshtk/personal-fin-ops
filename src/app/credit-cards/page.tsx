import type { Metadata } from "next";
import { CreditCardsView } from "@/components/views/CreditCards";

export const metadata: Metadata = { title: "Credit cards" };

export default function Page() {
  return <CreditCardsView />;
}
