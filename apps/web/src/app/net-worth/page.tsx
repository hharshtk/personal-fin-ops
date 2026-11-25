import type { Metadata } from "next";
import { NetWorthView } from "@/components/views/NetWorth";

export const metadata: Metadata = { title: "Net worth" };

export default function Page() {
  return <NetWorthView />;
}
