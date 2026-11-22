import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  FileChartColumn,
  Flag,
  Gauge,
  LayoutGrid,
  Landmark,
  Scale,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** second key of the "g …" chord */
  key: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  { items: [{ href: "/", label: "Overview", icon: LayoutGrid, key: "o" }] },
  {
    label: "Money",
    items: [
      { href: "/accounts", label: "Accounts & cash", icon: Landmark, key: "a" },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, key: "t" },
      { href: "/budget", label: "Budget & cash flow", icon: Gauge, key: "b" },
    ],
  },
  {
    label: "Wealth",
    items: [
      { href: "/investments", label: "Investments", icon: ChartNoAxesCombined, key: "i" },
      { href: "/net-worth", label: "Net worth", icon: Scale, key: "n" },
      { href: "/goals", label: "Goals", icon: Flag, key: "g" },
    ],
  },
  {
    label: "Commitments",
    items: [
      { href: "/liabilities", label: "Loans & credit", icon: CreditCard, key: "l" },
      { href: "/calendar", label: "Bills & calendar", icon: CalendarDays, key: "c" },
      { href: "/insurance", label: "Insurance", icon: ShieldCheck, key: "p" },
    ],
  },
  { label: "Insight", items: [{ href: "/reports", label: "Reports", icon: FileChartColumn, key: "r" }] },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings, key: "s" };

export const ALL_NAV: NavItem[] = [...NAV.flatMap((g) => g.items), SETTINGS_ITEM];

export function activeNav(pathname: string): NavItem | undefined {
  if (pathname === "/") return ALL_NAV[0];
  return ALL_NAV.find((n) => n.href !== "/" && (pathname === n.href || pathname.startsWith(n.href + "/")));
}
