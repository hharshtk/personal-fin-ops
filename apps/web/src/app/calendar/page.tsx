import type { Metadata } from "next";
import { CalendarView } from "@/components/views/Calendar";

export const metadata: Metadata = { title: "Bills & calendar" };

export default function Page() {
  return <CalendarView />;
}
