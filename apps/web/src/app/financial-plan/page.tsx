import type { Metadata } from "next";
import { FinancialPlan } from "@/components/views/FinancialPlan";

export const metadata: Metadata = { title: "Financial plan" };

export default function Page() {
  return <FinancialPlan />;
}
