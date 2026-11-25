import type { Metadata } from "next";
import { InsuranceView } from "@/components/views/Insurance";

export const metadata: Metadata = { title: "Insurance" };

export default function Page() {
  return <InsuranceView />;
}
