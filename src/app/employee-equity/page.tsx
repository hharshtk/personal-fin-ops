import type { Metadata } from "next";
import { EmployeeEquityView } from "@/components/views/EmployeeEquity";

export const metadata: Metadata = { title: "Employee equity" };

export default function Page() {
  return <EmployeeEquityView />;
}
