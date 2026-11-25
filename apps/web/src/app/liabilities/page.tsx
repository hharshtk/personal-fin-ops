import type { Metadata } from "next";
import { LiabilitiesView } from "@/components/views/Liabilities";

export const metadata: Metadata = { title: "Loans & credit" };

export default function Page() {
  return <LiabilitiesView />;
}
