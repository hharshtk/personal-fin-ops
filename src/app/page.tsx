import type { Metadata } from "next";
import { Overview } from "@/components/views/Overview";

export const metadata: Metadata = { title: { absolute: "Arthashala · Overview" } };

export default function Page() {
  return <Overview />;
}
