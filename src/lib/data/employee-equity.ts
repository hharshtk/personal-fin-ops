import type { EquityMarketInput, EquityPlan } from "../types";
import { equitySecurityKey } from "../employee-equity";

const indianStock = { employer: "Samved Systems", ticker: "SAMVED", exchange: "NSE", market: "indian", currency: "INR" } as const;
const foreignStock = { employer: "Meridian Cloud", ticker: "MRDN", exchange: "NASDAQ", market: "foreign", currency: "USD" } as const;

export const EQUITY_PLANS: EquityPlan[] = [
  {
    ...indianStock, id: "samved-esop-2023", kind: "esop", name: "2023 option grant",
    grantedOn: "2023-12-01", strikePrice: 640,
    tranches: [
      { id: "t1", vestsOn: "2024-12-01", expiresOn: "2026-10-31", options: 100 },
      { id: "t2", vestsOn: "2025-12-01", expiresOn: "2026-12-15", options: 140 },
      { id: "t3", vestsOn: "2026-12-01", expiresOn: "2028-12-01", options: 140 },
      { id: "t4", vestsOn: "2027-12-01", expiresOn: "2029-12-01", options: 140 },
    ],
    activity: [
      { id: "e1", kind: "exercise", trancheId: "t1", date: "2025-06-05", options: 80, price: 640 },
      { id: "e2", kind: "exercise", trancheId: "t2", date: "2026-02-04", options: 40, price: 640 },
      { id: "s1", kind: "sale", date: "2026-08-17", shares: 25, price: 1260 },
    ],
  },
  {
    ...foreignStock, id: "meridian-esop-2024", kind: "esop", name: "2024 option grant",
    grantedOn: "2024-09-12", strikePrice: 75,
    tranches: [
      { id: "t1", vestsOn: "2025-09-12", expiresOn: "2027-03-31", options: 80 },
      { id: "t2", vestsOn: "2026-09-12", expiresOn: "2028-03-31", options: 80 },
      { id: "t3", vestsOn: "2027-09-12", expiresOn: "2029-03-31", options: 80 },
    ],
    activity: [
      { id: "e1", kind: "exercise", trancheId: "t1", date: "2026-09-15", options: 36, price: 75 },
      { id: "s1", kind: "sale", date: "2026-10-02", shares: 10, price: 173 },
    ],
  },
  {
    ...indianStock, id: "samved-esop-2025", kind: "esop", name: "2025 refresher grant",
    grantedOn: "2025-11-27", strikePrice: 910,
    tranches: [
      { id: "t1", vestsOn: "2026-11-27", expiresOn: "2028-11-27", options: 60 },
      { id: "t2", vestsOn: "2027-11-27", expiresOn: "2029-11-27", options: 60 },
    ],
    activity: [],
  },
  {
    ...indianStock, id: "samved-espp-2026", kind: "espp", name: "Jul–Dec 2026 offering",
    startsOn: "2026-07-01", endsOn: "2026-12-31",
    purchaseDates: [{ id: "p1", scheduledOn: "2026-09-30" }, { id: "p2", scheduledOn: "2026-12-31" }],
    activity: [
      { id: "c1", kind: "contribution", date: "2026-07-31", amount: 14000 },
      { id: "c2", kind: "contribution", date: "2026-08-31", amount: 14000 },
      { id: "p1", kind: "purchase", purchaseDateId: "p1", date: "2026-09-30", shares: 24.5, price: 1080 },
      { id: "c3", kind: "contribution", date: "2026-10-30", amount: 8000 },
    ],
  },
  {
    ...foreignStock, id: "meridian-espp-2026", kind: "espp", name: "Sep–Nov 2026 offering",
    startsOn: "2026-09-01", endsOn: "2026-11-30",
    purchaseDates: [{ id: "p1", scheduledOn: "2026-11-30" }],
    activity: [
      { id: "c1", kind: "contribution", date: "2026-09-30", amount: 300 },
      { id: "c2", kind: "contribution", date: "2026-10-30", amount: 300 },
    ],
  },
];

export const EQUITY_MARKET_INPUTS: EquityMarketInput[] = [
  { kind: "price", key: equitySecurityKey({ ...indianStock, id: "" }), date: "2026-11-20", value: 1342.5 },
  { kind: "price", key: equitySecurityKey({ ...foreignStock, id: "" }), date: "2026-11-20", value: 182.4 },
  { kind: "fx", key: "USD", date: "2026-10-30", value: 86.9 },
  { kind: "fx", key: "USD", date: "2026-11-20", value: 87.25 },
];
