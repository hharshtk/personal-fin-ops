import type { Metadata } from "next";
import { AccountsView } from "@/components/views/Accounts";

export const metadata: Metadata = { title: "Accounts & cash" };

export default function Page() {
  return <AccountsView />;
}
