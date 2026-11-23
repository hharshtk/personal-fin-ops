/**
 * Builds the demonstration ledger: ~7 months of transactions (May–Nov 2026),
 * card statements and payments derived from card spends, and dated
 * occurrences of every recurring commitment. Deterministic (seeded), so the
 * server render and the browser always agree.
 */
import type {
  Commitment,
  EntityRef,
  ISODate,
  MonthKey,
  Occurrence,
  PaymentMethod,
  Transaction,
  TxnType,
} from "../types";
import { addDays, addMonths, daysInMonth, monthOf, parts } from "../format";
import { AS_OF, CARD_OPENING, CARDS, COMMITMENTS, DATA_START } from "./core";

/* ── seeded PRNG ── */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261122);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

type Draft = Omit<Transaction, "id">;

const drafts: Draft[] = [];

function add(
  date: ISODate,
  description: string,
  amount: number,
  type: TxnType,
  categoryId: string,
  accountId: string,
  method: PaymentMethod,
  extra: Partial<Draft> = {},
) {
  if (date > AS_OF || date < DATA_START) return;
  drafts.push({
    date,
    description,
    amount,
    type,
    categoryId,
    accountId,
    method,
    source: "imported",
    status: "cleared",
    ...extra,
  });
}

const MONTHS_IN_RANGE = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
const d = (month: string, day: number): ISODate => {
  const { y, m } = parts(`${month}-01`);
  return `${month}-${String(Math.min(day, daysInMonth(y, m))).padStart(2, "0")}`;
};

/* ───────────── Income ───────────── */

for (const mo of MONTHS_IN_RANGE) {
  const salary = mo >= "2026-10" ? 246800 : 238600;
  add(d(mo, 1), "Salary · Kestrel Analytics Pvt Ltd", salary, "income", "salary", "hdfc-sb", "NEFT");
}
add("2026-07-15", "Annual performance bonus · Kestrel Analytics", 124000, "income", "salary", "hdfc-sb", "NEFT", { note: "FY 2025–26 bonus, after TDS" });
add("2026-08-22", "Lumen Labs · consulting invoice #014", 45000, "income", "freelance", "hdfc-sb", "IMPS");
add("2026-10-18", "Lumen Labs · consulting invoice #017", 35000, "income", "freelance", "hdfc-sb", "IMPS");

const dividends: [ISODate, string, number, string][] = [
  ["2026-06-24", "ITC final dividend", 2600, "itc"],
  ["2026-06-27", "Infosys final dividend", 2640, "infy"],
  ["2026-07-18", "HDFC Bank dividend", 3300, "hdfcbank"],
  ["2026-07-24", "Larsen & Toubro dividend", 2040, "lt"],
  ["2026-08-19", "Reliance Industries dividend", 880, "reliance"],
  ["2026-10-17", "TCS interim dividend", 495, "tcs"],
  ["2026-10-28", "Infosys interim dividend", 2520, "infy"],
];
for (const [date, desc, amt, hid] of dividends) {
  add(date, desc, amt, "dividend", "dividends", "hdfc-sb", "NEFT", { link: { kind: "holding", id: hid } });
}
add("2026-07-01", "RBI Floating Rate Bond interest", 8050, "interest", "interest", "sbi-sb", "NEFT", { link: { kind: "holding", id: "rbi-frsb" } });
for (const [date, acc, amt] of [
  ["2026-06-30", "hdfc-sb", 2410], ["2026-06-30", "icici-sb", 860], ["2026-06-30", "sbi-sb", 390], ["2026-06-30", "idfc-sb", 4920],
  ["2026-09-30", "hdfc-sb", 2560], ["2026-09-30", "icici-sb", 790], ["2026-09-30", "sbi-sb", 402], ["2026-09-30", "idfc-sb", 5050],
] as [ISODate, string, number][]) {
  add(date, "Savings interest credit", amt, "interest", "interest", acc, "NEFT");
}
add("2026-06-09", "Amazon refund · order 408-771", 2199, "refund", "shopping", "icici-cc", "Card");
add("2026-09-21", "Myntra refund · return 9921", 1499, "refund", "shopping", "hdfc-cc", "Card");

/* ───────────── Recurring commitments ───────────── */

const bescom: Record<string, number> = { "2026-05": 2460, "2026-06": 2380, "2026-07": 1960, "2026-08": 1840, "2026-09": 1920, "2026-10": 2050 };
const water: Record<string, number> = { "2026-05": 460, "2026-06": 440, "2026-07": 380, "2026-08": 390, "2026-09": 410, "2026-10": 430, "2026-11": 420 };
const gas: Record<string, number> = { "2026-05": 1060, "2026-07": 1080, "2026-09": 1120, "2026-11": 1100 };

const commitmentTxn: Record<string, (mo: string) => void> = {
  "c-home-emi": (mo) => add(d(mo, 5), "HDFC Bank home loan EMI · HL-0092", -56409, "emi", "emi", "hdfc-sb", "NACH", { commitmentId: "c-home-emi", link: { kind: "loan", id: "home-loan" } }),
  "c-car-emi": (mo) => add(d(mo, 10), "ICICI Bank car loan EMI · CL-4417", -18748, "emi", "emi", "icici-sb", "NACH", { commitmentId: "c-car-emi", link: { kind: "loan", id: "car-loan" } }),
  "c-edu-emi": (mo) => add(d(mo, 12), "SBI education loan EMI · EL-2207", -4688, "emi", "emi", "sbi-sb", "Auto-debit", { commitmentId: "c-edu-emi", link: { kind: "loan", id: "edu-loan" } }),
  "c-family": (mo) => add(d(mo, 15), "To S. Iyer · loan repayment", -10000, "emi", "emi", "hdfc-sb", "UPI", { commitmentId: "c-family", link: { kind: "loan", id: "family-loan" } }),
  "c-sip-ppfas": (mo) => add(d(mo, 7), "SIP · Parag Parikh Flexi Cap Fund", -15000, "investment", "investments", "hdfc-sb", "NACH", { commitmentId: "c-sip-ppfas", link: { kind: "holding", id: "ppfas" } }),
  "c-sip-uti": (mo) => add(d(mo, 7), "SIP · UTI Nifty 50 Index Fund", -10000, "investment", "investments", "hdfc-sb", "NACH", { commitmentId: "c-sip-uti", link: { kind: "holding", id: "uti-nifty" } }),
  "c-sip-mid": (mo) => add(d(mo, 15), "SIP · HDFC Mid-Cap Opportunities", -7500, "investment", "investments", "hdfc-sb", "NACH", { commitmentId: "c-sip-mid", link: { kind: "holding", id: "hdfc-mid" } }),
  "c-sip-axis": (mo) => add(d(mo, 15), "SIP · Axis Small Cap Fund", -5000, "investment", "investments", "hdfc-sb", "NACH", { commitmentId: "c-sip-axis", link: { kind: "holding", id: "axis-small" } }),
  "c-sip-mo": (mo) => add(d(mo, 21), "SIP · Motilal Oswal Nasdaq 100 FoF", -5000, "investment", "investments", "hdfc-sb", "NACH", { commitmentId: "c-sip-mo", link: { kind: "holding", id: "mo-nasdaq" } }),
  "c-nps": (mo) => add(d(mo, 25), "NPS Tier I contribution · Protean", -5000, "investment", "investments", "hdfc-sb", "Netbanking", { commitmentId: "c-nps", link: { kind: "holding", id: "nps" } }),
  "c-rd": (mo) => add(d(mo, 3), "Recurring deposit installment · ••6618", -10000, "investment", "investments", "icici-sb", "Auto-debit", { commitmentId: "c-rd", link: { kind: "account", id: "icici-rd" } }),
  "c-emergency": (mo) => add(d(mo, 3), "To IDFC FIRST Savings · emergency fund", -15000, "transfer", "transfer", "hdfc-sb", "IMPS", { commitmentId: "c-emergency", counterpartyId: "idfc-sb" }),
  "c-cook": (mo) => add(d(mo, 1), "Lakshmamma · cook", -9000, "expense", "household", "icici-sb", "UPI", { commitmentId: "c-cook" }),
  "c-maint": (mo) => add(d(mo, 10), "MyGate · Lakeview Residency maintenance", -4800, "expense", "home", "icici-sb", "UPI", { commitmentId: "c-maint", link: { kind: "asset", id: "apartment" } }),
  "c-bescom": (mo) => bescom[mo] && add(d(mo, 21), "BESCOM electricity · RR 4410-77", -bescom[mo], "expense", "utilities", "icici-sb", "UPI", { commitmentId: "c-bescom" }),
  "c-water": (mo) => water[mo] && add(d(mo, 18), "BWSSB water charges", -water[mo], "expense", "utilities", "icici-sb", "UPI", { commitmentId: "c-water" }),
  "c-gas": (mo) => gas[mo] && add(d(mo, 9), "Megha Gas · piped gas bill", -gas[mo], "expense", "utilities", "icici-sb", "UPI", { commitmentId: "c-gas" }),
  "c-act": (mo) => add(d(mo, 8), "ACT Fibernet · 300 Mbps", -1179, "expense", "utilities", "hdfc-cc", "Card", { commitmentId: "c-act" }),
  "c-airtel": (mo) => add(d(mo, 14), "Airtel postpaid", -699, "expense", "utilities", "icici-cc", "Card", { commitmentId: "c-airtel" }),
  "c-netflix": (mo) => add(d(mo, 2), "Netflix", -649, "expense", "entertainment", "hdfc-cc", "Card", { commitmentId: "c-netflix" }),
  "c-icloud": (mo) => add(d(mo, 11), "Apple · iCloud+", -75, "expense", "entertainment", "hdfc-cc", "Card", { commitmentId: "c-icloud" }),
  "c-spotify": (mo) => add(d(mo, 19), "Spotify Premium", -139, "expense", "entertainment", "icici-cc", "Card", { commitmentId: "c-spotify" }),
  "c-youtube": (mo) => add(d(mo, 24), "Google · YouTube Premium", -149, "expense", "entertainment", "hdfc-cc", "Card", { commitmentId: "c-youtube" }),
};

for (const mo of MONTHS_IN_RANGE) {
  for (const fn of Object.values(commitmentTxn)) fn(mo);
  add(d(mo, 2), "To ICICI Bank Savings · household", -60000, "transfer", "transfer", "hdfc-sb", "IMPS", { counterpartyId: "icici-sb" });
  add(d(mo, 2), "To SBI Savings · loan EMI cover", -6000, "transfer", "transfer", "hdfc-sb", "IMPS", { counterpartyId: "sbi-sb" });
}
for (const date of ["2026-05-12", "2026-07-11", "2026-09-13", "2026-10-30"]) {
  add(date, "ATM withdrawal · HDFC Whitefield", -5000, "transfer", "cash", "hdfc-sb", "ATM", { counterpartyId: "cash" });
}

/* ───────────── Discretionary spending, May–Oct (predetermined monthly totals) ───────────── */

type Route = [accountId: string, method: PaymentMethod, weight: number];
const merchants: Record<string, { names: string[]; routes: Route[]; count: number }> = {
  groceries: { names: ["BigBasket", "Zepto", "Blinkit", "DMart Whitefield", "Namdhari's Fresh", "Swiggy Instamart"], routes: [["hdfc-cc", "Card", 0.45], ["icici-sb", "UPI", 0.4], ["icici-cc", "Card", 0.15]], count: 8 },
  dining: { names: ["Swiggy", "Zomato", "Third Wave Coffee", "Truffles", "Meghana Foods", "MTR 1924", "Chai Point", "Rameshwaram Cafe"], routes: [["hdfc-cc", "Card", 0.5], ["icici-sb", "UPI", 0.5]], count: 10 },
  transport: { names: ["Uber", "Ola", "Namma Yatri", "Rapido", "Indian Oil · Whitefield", "HP Petrol · ITPL", "FASTag recharge"], routes: [["icici-sb", "UPI", 0.65], ["hdfc-cc", "Card", 0.35]], count: 8 },
  shopping: { names: ["Amazon", "Flipkart", "Myntra", "Decathlon", "IKEA Nagasandra", "Croma", "Uniqlo"], routes: [["icici-cc", "Card", 0.45], ["hdfc-cc", "Card", 0.55]], count: 3 },
  health: { names: ["Apollo Pharmacy", "PharmEasy", "Practo", "cult.fit"], routes: [["icici-sb", "UPI", 0.6], ["hdfc-cc", "Card", 0.4]], count: 2 },
  personal: { names: ["Naturals Salon", "Urban Company", "Bblunt"], routes: [["icici-sb", "UPI", 0.5], ["cash", "Cash", 0.5]], count: 2 },
  gifts: { names: ["Ferns N Petals", "Anand Sweets", "Archies", "Amazon Pay gift card"], routes: [["icici-sb", "UPI", 0.6], ["hdfc-cc", "Card", 0.4]], count: 2 },
  entertainment: { names: ["BookMyShow", "PVR INOX", "Kindle Store"], routes: [["hdfc-cc", "Card", 1]], count: 1 },
  education: { names: ["Coursera", "Udemy", "Blossom Book House"], routes: [["hdfc-cc", "Card", 1]], count: 1 },
  home: { names: ["Urban Company · cleaning", "Hoodi hardware store", "Pepperfry"], routes: [["icici-sb", "UPI", 0.5], ["cash", "Cash", 0.5]], count: 2 },
};

const plan: Record<string, Record<string, number>> = {
  "2026-05": { groceries: 11900, dining: 8800, transport: 5600, shopping: 6400, health: 1800, personal: 1600, gifts: 1200, entertainment: 700, education: 0, home: 800 },
  "2026-06": { groceries: 12400, dining: 8200, transport: 6100, shopping: 7800, health: 2100, personal: 1800, gifts: 2000, entertainment: 900, education: 1499, home: 600 },
  "2026-07": { groceries: 13100, dining: 9400, transport: 5800, shopping: 6200, health: 4800, personal: 2200, gifts: 1500, entertainment: 1400, education: 0, home: 2400 },
  "2026-08": { groceries: 12800, dining: 7900, transport: 7400, shopping: 9100, health: 1600, personal: 1500, gifts: 3500, entertainment: 600, education: 3999, home: 900 },
  "2026-09": { groceries: 13600, dining: 8600, transport: 6200, shopping: 5400, health: 2900, personal: 2400, gifts: 1000, entertainment: 1800, education: 499, home: 1200 },
  "2026-10": { groceries: 14900, dining: 11200, transport: 6900, shopping: 18600, health: 1900, personal: 2900, gifts: 5800, entertainment: 1200, education: 0, home: 3400 },
};

function chooseRoute(routes: Route[]): Route {
  const r = rand();
  let acc = 0;
  for (const route of routes) {
    acc += route[2];
    if (r <= acc) return route;
  }
  return routes[routes.length - 1];
}

for (const [mo, totals] of Object.entries(plan)) {
  const { y, m } = parts(`${mo}-01`);
  const dim = daysInMonth(y, m);
  for (const [cat, total] of Object.entries(totals)) {
    if (!total) continue;
    const spec = merchants[cat];
    const n = Math.max(1, Math.min(spec.count, Math.round(total / 300)));
    const weights = Array.from({ length: n }, () => 0.5 + rand());
    const sum = weights.reduce((a, b) => a + b, 0);
    let remaining = total;
    weights.forEach((w, i) => {
      const amt = i === n - 1 ? remaining : Math.max(60, Math.round((total * w) / sum));
      remaining -= amt;
      const [acc, method] = chooseRoute(spec.routes);
      add(d(mo, 1 + Math.floor(rand() * dim)), pick(spec.names), -amt, "expense", cat, acc, method);
    });
  }
  // Weekly vegetable market, paid in cash
  for (let day = 4; day <= dim; day += 7) {
    add(d(mo, day), "Sunday market · vegetables", -(260 + Math.round(rand() * 22) * 10), "expense", "groceries", "cash", "Cash");
  }
}

// One-offs with a story
add("2026-05-23", "Coorg homestay · Misty Ridge", -9800, "expense", "travel", "hdfc-cc", "Card");
add("2026-05-22", "Indian Oil · Mysuru Road", -2400, "expense", "travel", "hdfc-cc", "Card");
add("2026-05-25", "Coorg · coffee estate tour", -2000, "expense", "travel", "icici-sb", "UPI");
add("2026-08-08", "IndiGo · BLR–GOI return", -11840, "expense", "travel", "hdfc-cc", "Card");
add("2026-08-14", "Airbnb · Assagao villa, 4 nights", -21460, "expense", "travel", "hdfc-cc", "Card");
add("2026-08-16", "Goa · scooter rental and fuel", -5300, "expense", "travel", "icici-sb", "UPI");
add("2026-09-06", "Hyundai service · Advaith Motors", -8400, "expense", "transport", "icici-cc", "Card", { link: { kind: "asset", id: "creta" } });
add("2026-07-19", "cult.fit · quarterly membership", -7999, "expense", "health", "hdfc-cc", "Card");
add("2026-10-21", "cult.fit · quarterly membership", -7999, "expense", "health", "hdfc-cc", "Card");

/* ───────────── November 2026, line by line ───────────── */

type N = [day: number, desc: string, amount: number, cat: string, acc: string, method: PaymentMethod];
const november: N[] = [
  [1, "Zepto", 486, "groceries", "icici-sb", "UPI"],
  [3, "BigBasket", 2412, "groceries", "hdfc-cc", "Card"],
  [6, "DMart Whitefield", 1968, "groceries", "hdfc-cc", "Card"],
  [9, "Blinkit", 642, "groceries", "icici-sb", "UPI"],
  [12, "Namdhari's Fresh", 1134, "groceries", "icici-sb", "UPI"],
  [15, "Swiggy Instamart", 718, "groceries", "icici-sb", "UPI"],
  [18, "BigBasket", 1846, "groceries", "hdfc-cc", "Card"],
  [21, "Zepto", 774, "groceries", "icici-sb", "UPI"],

  [1, "Third Wave Coffee", 420, "dining", "icici-sb", "UPI"],
  [4, "Swiggy", 684, "dining", "hdfc-cc", "Card"],
  [7, "Meghana Foods", 1240, "dining", "hdfc-cc", "Card"],
  [8, "Zomato", 912, "dining", "hdfc-cc", "Card"],
  [11, "Truffles", 1086, "dining", "icici-sb", "UPI"],
  [13, "Swiggy", 538, "dining", "hdfc-cc", "Card"],
  [14, "Toit Brewpub", 2860, "dining", "hdfc-cc", "Card"],
  [16, "Rameshwaram Cafe", 340, "dining", "icici-sb", "UPI"],
  [18, "Zomato", 762, "dining", "hdfc-cc", "Card"],
  [20, "Swiggy", 486, "dining", "hdfc-cc", "Card"],
  [21, "MTR 1924", 830, "dining", "icici-sb", "UPI"],
  [22, "Swiggy", 462, "dining", "hdfc-cc", "Card"],

  [5, "Anand Sweets · Diwali boxes", 2140, "gifts", "icici-sb", "UPI"],
  [6, "Ferns N Petals", 1460, "gifts", "hdfc-cc", "Card"],
  [7, "Amazon Pay gift card", 2000, "gifts", "icici-cc", "Card"],
  [11, "Archies · Bhai Dooj", 1250, "gifts", "hdfc-cc", "Card"],

  [2, "Amazon", 3499, "shopping", "icici-cc", "Card"],
  [4, "Myntra", 2899, "shopping", "hdfc-cc", "Card"],
  [6, "Decathlon", 1648, "shopping", "hdfc-cc", "Card"],
  [17, "Amazon", 1194, "shopping", "icici-cc", "Card"],

  [7, "Lakshmamma · Diwali bonus", 2000, "household", "icici-sb", "UPI"],
  [5, "Diwali lights · Hoodi market", 640, "home", "cash", "Cash"],

  [3, "Uber", 412, "transport", "icici-sb", "UPI"],
  [6, "Indian Oil · Whitefield", 2600, "transport", "hdfc-cc", "Card"],
  [10, "Namma Yatri", 186, "transport", "icici-sb", "UPI"],
  [13, "Uber", 538, "transport", "icici-sb", "UPI"],
  [17, "FASTag recharge", 500, "transport", "icici-sb", "UPI"],
  [19, "Rapido", 126, "transport", "icici-sb", "UPI"],
  [21, "Ola", 598, "transport", "icici-sb", "UPI"],

  [12, "Apollo Pharmacy", 784, "health", "icici-sb", "UPI"],
  [19, "Practo · consultation", 456, "health", "hdfc-cc", "Card"],
  [15, "BookMyShow", 1180, "entertainment", "hdfc-cc", "Card"],
  [16, "IndiGo · BLR–GOI, 26 Dec", 8940, "travel", "hdfc-cc", "Card"],
  [9, "Naturals Salon", 650, "personal", "cash", "Cash"],
  [20, "Urban Company · grooming", 800, "personal", "icici-sb", "UPI"],
  [14, "Blossom Book House", 899, "education", "hdfc-cc", "Card"],
];
for (const [day, desc, amt, cat, acc, method] of november) {
  add(d("2026-11", day), desc, -amt, "expense", cat, acc, method);
}
add("2026-11-06", "Tanishq · 24K gold coin, 3 g (Dhanteras)", -38520, "investment", "investments", "hdfc-sb", "Card", {
  link: { kind: "asset", id: "gold-jewellery" },
  note: "Bought with the HDFC debit card",
});

/* ───────────── Card statements & payments (derived from card spends) ───────────── */

export interface Statement {
  cardId: string;
  periodStart: ISODate;
  date: ISODate;
  due: ISODate;
  amount: number;
  minimumDue?: number;
}

export const STATEMENTS: Statement[] = [];

// Sample issuer-reported amounts for the latest statements.
const STATEMENT_MINIMUMS: Record<string, Record<ISODate, number>> = {
  "hdfc-cc": { "2026-11-10": 2480 },
  "icici-cc": { "2026-11-01": 730 },
};

for (const card of CARDS) {
  const cardTxns = drafts.filter((t) => t.accountId === card.id);
  const commitmentId = COMMITMENTS.find((c) => c.link?.kind === "card" && c.link.id === card.id)!.id;
  let prev: ISODate = "2026-04-30";
  let first = true;
  for (let i = 0; i < 8; i++) {
    const stmtDate = addMonths("2026-05-01", i, card.statementDay);
    if (stmtDate > AS_OF) break;
    const cycle = cardTxns.filter((t) => t.date > prev && t.date <= stmtDate);
    const amount = -cycle.reduce((s, t) => s + t.amount, 0) + (first ? CARD_OPENING[card.id] : 0);
    const due = addMonths(stmtDate, card.dueDay > card.statementDay ? 0 : 1, card.dueDay);
    const payOn = card.autopayFrom ? due : addMonths(due, 0, parts(due).d - 2);
    const payFrom = card.autopayFrom ?? "hdfc-sb";
    const stmt: Statement = {
      cardId: card.id,
      periodStart: addDays(prev, 1),
      date: stmtDate,
      due,
      amount,
      minimumDue: STATEMENT_MINIMUMS[card.id]?.[stmtDate],
    };
    if (payOn <= AS_OF) {
      add(payOn, `${card.name} bill payment`, -amount, "card_payment", "card-payment", payFrom, card.autopayFrom ? "Auto-debit" : "Netbanking", {
        counterpartyId: card.id,
        commitmentId,
        occurrenceId: `${commitmentId}@${due}`,
      });
    }
    STATEMENTS.push(stmt);
    prev = stmtDate;
    first = false;
  }
}

/* ───────────── Finalise ───────────── */

drafts.sort((a, b) => (a.date === b.date ? b.amount - a.amount : a.date < b.date ? -1 : 1));

export const TRANSACTIONS: Transaction[] = drafts.map((t, i) => ({ ...t, id: `t${String(i + 1).padStart(4, "0")}` }));

/* ───────────── Commitment occurrences (Oct 2026 → Feb 2027) ───────────── */

/** Months the commitment calendar covers. */
export const CALENDAR_MONTHS: MonthKey[] = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"];
const yearlyDates: Record<string, ISODate> = {
  "c-ins-car": "2026-12-12",
  "c-ins-health": "2027-01-06",
  "c-ins-term": "2027-02-14",
};

function commitmentDates(c: Commitment): ISODate[] {
  if (c.cadence === "Yearly") return [yearlyDates[c.id]].filter(Boolean);
  return CALENDAR_MONTHS.filter((mo) => c.cadence !== "Bi-monthly" || Number(mo.slice(5)) % 2 === 1).map((mo) => d(mo, c.day));
}

function estimateFor(c: Commitment, date: ISODate): number {
  if (c.kind === "card") {
    const cardId = c.link!.id;
    const stmt = STATEMENTS.find((s) => s.cardId === cardId && monthOf(s.due) === monthOf(date));
    if (stmt) return stmt.amount;
    const recent = STATEMENTS.filter((s) => s.cardId === cardId).slice(-3);
    return Math.round(recent.reduce((a, s) => a + s.amount, 0) / Math.max(1, recent.length) / 100) * 100;
  }
  return c.amount;
}

export const OCCURRENCES: Occurrence[] = COMMITMENTS.flatMap((c) =>
  commitmentDates(c).map((date) => {
    const mo = monthOf(date);
    const txn = TRANSACTIONS.find((t) => t.commitmentId === c.id && monthOf(t.date) === mo);
    const amount = txn ? Math.abs(txn.amount) : estimateFor(c, date);
    let status: Occurrence["status"];
    if (txn) status = "paid";
    else if (date < AS_OF) status = "overdue";
    else if (!c.autopay) status = "due";
    else status = "scheduled";
    return {
      id: `${c.id}@${date}`,
      commitmentId: c.id,
      date,
      amount,
      status,
      paidOn: txn?.date,
      txnId: txn?.id,
    };
  }),
).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

export function refOf(kind: EntityRef["kind"], id: string): EntityRef {
  return { kind, id };
}
