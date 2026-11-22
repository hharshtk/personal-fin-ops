import type { Metadata } from "next";
import { GoalsView } from "@/components/views/Goals";

export const metadata: Metadata = { title: "Goals" };

export default function Page() {
  return <GoalsView />;
}
