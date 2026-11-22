import type { Metadata } from "next";
import { BudgetView } from "@/components/views/Budget";

export const metadata: Metadata = { title: "Budget & cash flow" };

export default function Page() {
  return <BudgetView />;
}
