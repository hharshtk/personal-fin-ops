/**
 * Demonstration data — a single, coherent synthetic financial profile.
 * Every figure is illustrative. Bank, fund and insurer names are used only as
 * realistic account labels; no integration or relationship is implied.
 */
import type {
  CashAccount,
  Category,
  Commitment,
  CreditCard,
  Goal,
  Holding,
  Loan,
  PhysicalAsset,
  Policy,
  ScheduleRow,
  Sip,
} from "../types";
import { addMonths } from "../format";

export const AS_OF = "2026-11-22";
export const DATA_START = "2026-05-01";

export const PROFILE = {
  name: "Rohan Iyer",
  initials: "RI",
  city: "Bengaluru",
  employer: "Kestrel Analytics Pvt Ltd",
  role: "Senior software engineer",
  currency: "INR" as const,
  fyStartMonth: 4,
};

/* ───────────── Categories & monthly budgets ───────────── */

export const CATEGORIES: Category[] = [
  { id: "salary", name: "Salary", group: "income" },
  { id: "freelance", name: "Freelance", group: "income" },
  { id: "interest", name: "Interest", group: "income" },
  { id: "dividends", name: "Dividends", group: "income" },
  { id: "refunds", name: "Refunds", group: "income" },

  { id: "groceries", name: "Groceries", group: "essentials", budget: 14000 },
  { id: "utilities", name: "Utilities & bills", group: "essentials", budget: 6500 },
  { id: "household", name: "Household help", group: "essentials", budget: 9500 },
  { id: "home", name: "Home & maintenance", group: "essentials", budget: 6000 },
  { id: "transport", name: "Transport & fuel", group: "essentials", budget: 7000 },
  { id: "health", name: "Health & fitness", group: "essentials", budget: 4000 },

  { id: "dining", name: "Dining & delivery", group: "lifestyle", budget: 9000 },
  { id: "shopping", name: "Shopping", group: "lifestyle", budget: 10000 },
  { id: "entertainment", name: "Entertainment & subscriptions", group: "lifestyle", budget: 3500 },
  { id: "travel", name: "Travel", group: "lifestyle", budget: 12000 },
  { id: "personal", name: "Personal care", group: "lifestyle", budget: 2500 },
  { id: "gifts", name: "Gifts & festivals", group: "lifestyle", budget: 4000 },
  { id: "education", name: "Learning & books", group: "lifestyle", budget: 2000 },

  { id: "emi", name: "Loan EMIs", group: "commitments" },
  { id: "investments", name: "Investments & SIPs", group: "commitments" },
  { id: "insurance", name: "Insurance premiums", group: "commitments" },

  { id: "transfer", name: "Self transfer", group: "transfers" },
  { id: "card-payment", name: "Card bill payment", group: "transfers" },
  { id: "cash", name: "Cash withdrawal", group: "transfers" },
];

/* ───────────── Cash, bank and deposits ───────────── */

export const CASH_ACCOUNTS: CashAccount[] = [
  {
    id: "hdfc-sb",
    kind: "savings",
    name: "HDFC Bank Savings",
    institution: "HDFC Bank",
    mask: "4821",
    currency: "INR",
    balance: 342180,
    role: "Salary account · pays home EMI and SIPs",
    interestRate: 3.0,
    openedOn: "2016-07-18",
    liquid: true,
  },
  {
    id: "icici-sb",
    kind: "savings",
    name: "ICICI Bank Savings",
    institution: "ICICI Bank",
    mask: "0937",
    currency: "INR",
    balance: 118640,
    role: "Household spending · car EMI, bills, UPI",
    interestRate: 3.0,
    openedOn: "2019-02-11",
    liquid: true,
  },
  {
    id: "idfc-sb",
    kind: "savings",
    name: "IDFC FIRST Savings",
    institution: "IDFC FIRST Bank",
    mask: "2210",
    currency: "INR",
    balance: 285000,
    role: "Emergency fund",
    interestRate: 7.0,
    openedOn: "2022-09-05",
    liquid: true,
    goalId: "g-emergency",
  },
  {
    id: "sbi-sb",
    kind: "savings",
    name: "SBI Savings",
    institution: "State Bank of India",
    mask: "5562",
    currency: "INR",
    balance: 46215,
    role: "Education loan EMI · PPF linked",
    interestRate: 2.7,
    openedOn: "2010-06-02",
    liquid: true,
  },
  {
    id: "cash",
    kind: "cash",
    name: "Cash in hand",
    institution: "Wallet",
    currency: "INR",
    balance: 6400,
    role: "Cash for local vendors",
    openedOn: "2026-05-01",
    liquid: true,
  },
  {
    id: "hdfc-fd",
    kind: "fd",
    name: "HDFC Bank Fixed Deposit",
    institution: "HDFC Bank",
    mask: "7781",
    currency: "INR",
    balance: 213640,
    principal: 200000,
    role: "Emergency fund reserve",
    interestRate: 7.1,
    openedOn: "2025-12-03",
    maturityDate: "2026-12-03",
    maturityAmount: 214660,
    liquid: false,
    goalId: "g-emergency",
  },
  {
    id: "sbi-fd",
    kind: "fd",
    name: "SBI Fixed Deposit",
    institution: "State Bank of India",
    mask: "3306",
    currency: "INR",
    balance: 154210,
    principal: 150000,
    role: "Parents' home renovation",
    interestRate: 6.8,
    openedOn: "2026-06-14",
    maturityDate: "2027-06-14",
    maturityAmount: 160480,
    liquid: false,
    goalId: "g-renovation",
  },
  {
    id: "icici-rd",
    kind: "rd",
    name: "ICICI Bank Recurring Deposit",
    institution: "ICICI Bank",
    mask: "6618",
    currency: "INR",
    balance: 143980,
    principal: 140000,
    role: "Japan trip savings",
    interestRate: 6.9,
    openedOn: "2025-10-03",
    maturityDate: "2027-10-03",
    maturityAmount: 256420,
    installment: 10000,
    installmentsPaid: 14,
    installmentsTotal: 24,
    liquid: false,
    goalId: "g-japan",
  },
];

/* ───────────── Credit cards ───────────── */

export const CARDS: CreditCard[] = [
  {
    id: "hdfc-cc",
    name: "HDFC Regalia Gold",
    institution: "HDFC Bank",
    network: "Visa",
    mask: "6604",
    currency: "INR",
    limit: 400000,
    statementDay: 10,
    dueDay: 28,
    rewardPoints: 18420,
  },
  {
    id: "icici-cc",
    name: "ICICI Amazon Pay",
    institution: "ICICI Bank",
    network: "Visa",
    mask: "1173",
    currency: "INR",
    limit: 250000,
    statementDay: 1,
    dueDay: 18,
    rewardPoints: 0,
    autopayFrom: "icici-sb",
  },
];

/** Card outstanding before the data window (spends from Apr 2026 cycles) */
export const CARD_OPENING: Record<string, number> = { "hdfc-cc": 18900, "icici-cc": 11200 };

/* ───────────── Loans & other liabilities ───────────── */

export const LOANS: Loan[] = [
  {
    id: "home-loan",
    kind: "home",
    name: "Home loan",
    lender: "HDFC Bank",
    mask: "HL-0092",
    currency: "INR",
    principal: 6500000,
    rate: 8.5,
    rateType: "Floating",
    tenureMonths: 240,
    emi: 56409,
    emiDay: 5,
    firstEmi: "2021-05-05",
    debitAccountId: "hdfc-sb",
    assetId: "apartment",
    note: "Repo-linked. Rate reset every 3 months.",
  },
  {
    id: "car-loan",
    kind: "car",
    name: "Car loan",
    lender: "ICICI Bank",
    mask: "CL-4417",
    currency: "INR",
    principal: 900000,
    rate: 9.15,
    rateType: "Fixed",
    tenureMonths: 60,
    emi: 18748,
    emiDay: 10,
    firstEmi: "2024-09-10",
    debitAccountId: "icici-sb",
    assetId: "creta",
  },
  {
    id: "edu-loan",
    kind: "education",
    name: "Education loan",
    lender: "State Bank of India",
    mask: "EL-2207",
    currency: "INR",
    principal: 360000,
    rate: 9.65,
    rateType: "Floating",
    tenureMonths: 120,
    emi: 4688,
    emiDay: 12,
    firstEmi: "2017-05-12",
    debitAccountId: "sbi-sb",
    note: "M.Tech, 2014–16. Five installments left.",
  },
  {
    id: "family-loan",
    kind: "family",
    name: "Loan from father",
    lender: "S. Iyer (father)",
    currency: "INR",
    principal: 200000,
    rate: 0,
    rateType: "Interest-free",
    tenureMonths: 20,
    emi: 10000,
    emiDay: 15,
    firstEmi: "2025-12-15",
    debitAccountId: "hdfc-sb",
    assetId: "apartment",
    note: "Borrowed for the apartment's interiors in Nov 2025. Informal, no paperwork.",
  },
];

/**
 * Repayment schedule fixture. Builds the predetermined installment table for a
 * mock loan (standard reducing-balance EMI); the UI only reads these rows.
 */
export function buildSchedule(loan: Loan): ScheduleRow[] {
  const r = loan.rate / 12 / 100;
  let balance = loan.principal;
  const rows: ScheduleRow[] = [];
  for (let n = 1; n <= loan.tenureMonths; n++) {
    const interest = Math.round(balance * r);
    let emi = loan.emi;
    let principal = emi - interest;
    if (n === loan.tenureMonths || principal > balance) {
      principal = Math.round(balance);
      emi = principal + interest;
    }
    balance = Math.max(0, balance - principal);
    rows.push({
      n,
      date: addMonths(loan.firstEmi, n - 1, loan.emiDay),
      emi,
      principal,
      interest,
      balance: Math.round(balance),
    });
    if (balance <= 0) break;
  }
  return rows;
}

/* ───────────── Investments ───────────── */

function h(
  base: Omit<Holding, "invested" | "current"> & { invested?: number; current?: number },
): Holding {
  const invested = base.invested ?? Math.round((base.units ?? 0) * (base.avgCost ?? 0));
  const current = base.current ?? Math.round((base.units ?? 0) * (base.price ?? 0));
  return { ...base, invested, current };
}

export const HOLDINGS: Holding[] = [
  // Equity mutual funds
  h({ id: "ppfas", assetClass: "mf", type: "Flexi cap fund", name: "Parag Parikh Flexi Cap Fund", symbol: "Folio 18820431", platform: "Zerodha Coin", units: 8412.62, avgCost: 64.2, price: 92.48, xirr: 17.8, dayChangePct: 0.42, sipId: "sip-ppfas", goalId: "g-retire" }),
  h({ id: "uti-nifty", assetClass: "mf", type: "Index fund", name: "UTI Nifty 50 Index Fund", symbol: "Folio 50210877", platform: "Zerodha Coin", units: 2194.04, avgCost: 148.6, price: 176.2, xirr: 13.1, dayChangePct: 0.61, sipId: "sip-uti", goalId: "g-retire" }),
  h({ id: "hdfc-mid", assetClass: "mf", type: "Mid cap fund", name: "HDFC Mid-Cap Opportunities Fund", symbol: "Folio 99231460", platform: "Zerodha Coin", units: 1402.7, avgCost: 168.2, price: 214.9, xirr: 21.4, dayChangePct: 0.88, sipId: "sip-hdfc-mid", goalId: "g-mba" }),
  h({ id: "axis-small", assetClass: "mf", type: "Small cap fund", name: "Axis Small Cap Fund", symbol: "Folio 91022584", platform: "Zerodha Coin", units: 1488.3, avgCost: 98.4, price: 112.6, xirr: 11.2, dayChangePct: -0.34, sipId: "sip-axis", goalId: "g-mba" }),
  h({ id: "mirae-elss", assetClass: "mf", type: "ELSS tax saver", name: "Mirae Asset ELSS Tax Saver Fund", symbol: "Folio 79815302", platform: "Zerodha Coin", units: 3210.5, avgCost: 38.9, price: 52.7, xirr: 15.6, dayChangePct: 0.51, goalId: "g-mba", lockIn: "Units from Mar 2024 unlock Mar 2027" }),

  // Indian equity (direct) and equity ETF
  h({ id: "infy", assetClass: "equity", type: "Large cap · IT", name: "Infosys", symbol: "INFY", platform: "Zerodha Kite", units: 120, avgCost: 1412, price: 1586, xirr: 9.8, dayChangePct: 1.12 }),
  h({ id: "hdfcbank", assetClass: "equity", type: "Large cap · Banking", name: "HDFC Bank", symbol: "HDFCBANK", platform: "Zerodha Kite", units: 150, avgCost: 1540, price: 1812, xirr: 12.4, dayChangePct: 0.36 }),
  h({ id: "reliance", assetClass: "equity", type: "Large cap · Conglomerate", name: "Reliance Industries", symbol: "RELIANCE", platform: "Zerodha Kite", units: 160, avgCost: 1268, price: 1492, xirr: 14.1, dayChangePct: -0.58 }),
  h({ id: "tcs", assetClass: "equity", type: "Large cap · IT", name: "Tata Consultancy Services", symbol: "TCS", platform: "Zerodha Kite", units: 45, avgCost: 3640, price: 3312, xirr: -6.2, dayChangePct: 0.74 }),
  h({ id: "itc", assetClass: "equity", type: "Large cap · FMCG", name: "ITC", symbol: "ITC", platform: "Zerodha Kite", units: 400, avgCost: 412, price: 436, xirr: 5.1, dayChangePct: -0.21 }),
  h({ id: "lt", assetClass: "equity", type: "Large cap · Infrastructure", name: "Larsen & Toubro", symbol: "LT", platform: "Zerodha Kite", units: 60, avgCost: 3210, price: 3868, xirr: 16.9, dayChangePct: 1.46 }),
  h({ id: "asianpaint", assetClass: "equity", type: "Large cap · Paints", name: "Asian Paints", symbol: "ASIANPAINT", platform: "Zerodha Kite", units: 50, avgCost: 2980, price: 2512, xirr: -11.8, dayChangePct: -0.92 }),
  h({ id: "bajfinance", assetClass: "equity", type: "Large cap · NBFC", name: "Bajaj Finance", symbol: "BAJFINANCE", platform: "Zerodha Kite", units: 180, avgCost: 742, price: 1012, xirr: 24.6, dayChangePct: 2.08 }),
  h({ id: "titan", assetClass: "equity", type: "Large cap · Consumer", name: "Titan Company", symbol: "TITAN", platform: "Zerodha Kite", units: 40, avgCost: 3120, price: 3684, xirr: 13.7, dayChangePct: 0.18 }),
  h({ id: "niftybees", assetClass: "equity", type: "Index ETF", name: "Nippon India ETF Nifty 50 BeES", symbol: "NIFTYBEES", platform: "Zerodha Kite", units: 600, avgCost: 242, price: 281, xirr: 12.9, dayChangePct: 0.59 }),

  // International
  h({ id: "mo-nasdaq", assetClass: "international", type: "Fund of funds", name: "Motilal Oswal Nasdaq 100 FoF", symbol: "Folio 40122901", platform: "Zerodha Coin", units: 4116.2, avgCost: 34.0, price: 43.8, xirr: 19.2, dayChangePct: -0.73, sipId: "sip-mo", goalId: "g-car" }),
  h({ id: "aapl", assetClass: "international", type: "US stock", name: "Apple Inc.", symbol: "AAPL", platform: "Vested", units: 6, avgCost: 17100, price: 21400, xirr: 16.3, dayChangePct: 0.27, note: "Valued in INR at the as-of USD/INR rate" }),
  h({ id: "msft", assetClass: "international", type: "US stock", name: "Microsoft Corp.", symbol: "MSFT", platform: "Vested", units: 3, avgCost: 32800, price: 38900, xirr: 12.0, dayChangePct: -0.41, note: "Valued in INR at the as-of USD/INR rate" }),

  // Gold (financial)
  h({ id: "sgb", assetClass: "gold", type: "Sovereign Gold Bond", name: "SGB 2021-22 Series VIII", symbol: "40 g", platform: "RBI via HDFC Bank", units: 40, avgCost: 4791, price: 12840, xirr: 21.8, dayChangePct: 0.31, lockIn: "Matures Dec 2029 · exit window from Jun 2027", note: "Also pays 2.5% p.a. interest on the issue price" }),
  h({ id: "goldbees", assetClass: "gold", type: "Gold ETF", name: "Nippon India ETF Gold BeES", symbol: "GOLDBEES", platform: "Zerodha Kite", units: 1800, avgCost: 58, price: 104, xirr: 24.1, dayChangePct: 0.29, goalId: "g-renovation" }),

  // Debt & fixed income
  h({ id: "icici-corp", assetClass: "debt", type: "Corporate bond fund", name: "ICICI Prudential Corporate Bond Fund", symbol: "Folio 11408625", platform: "Zerodha Coin", units: 7820, avgCost: 26.84, price: 29.12, xirr: 7.4, dayChangePct: 0.02, goalId: "g-mba" }),
  h({ id: "rbi-frsb", assetClass: "debt", type: "RBI Floating Rate Bond", name: "RBI Floating Rate Savings Bonds 2020", symbol: "Holding 7731", platform: "SBI", invested: 200000, current: 200000, xirr: 8.05, lockIn: "7-year lock-in · matures Jul 2031", note: "Interest of ₹8,050 paid every Jan and Jul to SBI Savings" }),

  // Retirement
  h({ id: "epf", assetClass: "retirement", type: "Employees' Provident Fund", name: "EPF", symbol: "UAN ••4417", platform: "EPFO", invested: 1336000, current: 1482300, xirr: 8.25, lockIn: "Withdrawal at retirement or after 2 months unemployed", note: "₹16,800 employee + ₹16,800 employer each month via payroll", goalId: "g-retire" }),
  h({ id: "ppf", assetClass: "retirement", type: "Public Provident Fund", name: "PPF", symbol: "A/c ••0418", platform: "SBI", invested: 750000, current: 964500, xirr: 7.1, lockIn: "Matures Apr 2031 · partial withdrawal from FY 2027–28", goalId: "g-retire" }),
  h({ id: "nps", assetClass: "retirement", type: "NPS Tier I", name: "NPS Tier I", symbol: "PRAN ••2093", platform: "Protean CRA", invested: 495000, current: 618200, xirr: 10.9, sipId: "sip-nps", lockIn: "Until age 60", note: "Auto choice LC75 · ICICI Pru Pension Fund", goalId: "g-retire" }),
];

export const SIPS: Sip[] = [
  { id: "sip-ppfas", holdingId: "ppfas", amount: 15000, day: 7, debitAccountId: "hdfc-sb", startedOn: "2021-08-07", kind: "SIP" },
  { id: "sip-uti", holdingId: "uti-nifty", amount: 10000, day: 7, debitAccountId: "hdfc-sb", startedOn: "2022-01-07", kind: "SIP" },
  { id: "sip-hdfc-mid", holdingId: "hdfc-mid", amount: 7500, day: 15, debitAccountId: "hdfc-sb", startedOn: "2023-04-15", kind: "SIP" },
  { id: "sip-axis", holdingId: "axis-small", amount: 5000, day: 15, debitAccountId: "hdfc-sb", startedOn: "2024-02-15", kind: "SIP" },
  { id: "sip-mo", holdingId: "mo-nasdaq", amount: 5000, day: 21, debitAccountId: "hdfc-sb", startedOn: "2023-09-21", kind: "SIP" },
  { id: "sip-nps", holdingId: "nps", amount: 5000, day: 25, debitAccountId: "hdfc-sb", startedOn: "2022-06-25", kind: "NPS" },
];

/* ───────────── Physical assets ───────────── */

export const ASSETS: PhysicalAsset[] = [
  {
    id: "apartment",
    kind: "real_estate",
    name: "Apartment, Whitefield",
    detail: "3 BHK · 1,640 sq ft · Bengaluru · self-occupied",
    acquiredOn: "2021-04-20",
    cost: 9200000,
    currentValue: 11800000,
    valuationNote: "Estimate from recent resale listings in the same society, Oct 2026",
    loanId: "home-loan",
    policyId: "home-ins",
  },
  {
    id: "plot",
    kind: "real_estate",
    name: "Residential plot, Mysuru",
    detail: "1,200 sq ft · inherited half share",
    acquiredOn: "2019-03-11",
    cost: 1100000,
    currentValue: 1800000,
    valuationNote: "Guidance value plus local broker estimate, Apr 2026",
  },
  {
    id: "creta",
    kind: "vehicle",
    name: "Hyundai Creta SX",
    detail: "2024 · petrol · KA 53 MJ ••21",
    acquiredOn: "2024-08-24",
    cost: 1580000,
    currentValue: 1190000,
    valuationNote: "Insured declared value less one year's depreciation",
    loanId: "car-loan",
    policyId: "car-ins",
  },
  {
    id: "gold-jewellery",
    kind: "gold",
    name: "Gold jewellery & coins",
    detail: "82 g at 22K + 3 g 24K coin (Dhanteras 2026)",
    acquiredOn: "2015-11-11",
    cost: 312000,
    currentValue: 952000,
    valuationNote: "At ₹11,150/g (22K) and ₹12,840/g (24K) on 22 Nov 2026, before making charges",
  },
];

/* ───────────── Insurance ───────────── */

export const POLICIES: Policy[] = [
  {
    id: "health-self",
    kind: "health",
    name: "ReAssure 2.0",
    insurer: "Niva Bupa Health",
    policyNo: "NB-31088274",
    cover: 1500000,
    premium: 18640,
    frequency: "Yearly",
    startedOn: "2023-01-06",
    renewsOn: "2027-01-06",
    insured: "Self",
    nominee: "Meena Iyer (mother)",
    payFromId: "hdfc-cc",
    features: ["No room-rent cap", "Unlimited reinstatement", "2-year wait on pre-existing conditions completed"],
  },
  {
    id: "health-parents",
    kind: "parents_health",
    name: "Senior Citizens Red Carpet",
    insurer: "Star Health",
    policyNo: "SH-P-77012955",
    cover: 1000000,
    premium: 46200,
    frequency: "Yearly",
    startedOn: "2022-03-18",
    renewsOn: "2027-03-18",
    insured: "S. Iyer and Meena Iyer (parents)",
    payFromId: "hdfc-sb",
    features: ["30% co-pay on all claims", "Pre-existing conditions covered from year 2"],
  },
  {
    id: "term",
    kind: "term",
    name: "Click 2 Protect Super",
    insurer: "HDFC Life",
    policyNo: "HL-T-22917430",
    cover: 20000000,
    premium: 21480,
    frequency: "Yearly",
    startedOn: "2021-02-14",
    renewsOn: "2027-02-14",
    insured: "Self",
    nominee: "Meena Iyer (mother)",
    payFromId: "hdfc-sb",
    features: ["Cover till age 65", "Accidental death benefit rider ₹50 L", "Premium fixed for policy term"],
  },
  {
    id: "car-ins",
    kind: "vehicle",
    name: "Private Car Package Policy",
    insurer: "ICICI Lombard",
    policyNo: "IL-MC-30554182",
    cover: 1140000,
    premium: 21350,
    frequency: "Yearly",
    startedOn: "2024-12-12",
    renewsOn: "2026-12-12",
    insured: "Hyundai Creta SX · KA 53 MJ ••21",
    assetId: "creta",
    payFromId: "hdfc-cc",
    features: ["Zero depreciation add-on", "Engine protect", "No-claim bonus 20%"],
  },
  {
    id: "home-ins",
    kind: "home",
    name: "My Home Insurance",
    insurer: "Bajaj Allianz",
    policyNo: "BA-HM-60119347",
    cover: 6000000,
    premium: 3240,
    frequency: "Yearly",
    startedOn: "2021-04-18",
    renewsOn: "2027-04-18",
    insured: "Apartment, Whitefield (structure and contents)",
    assetId: "apartment",
    payFromId: "hdfc-sb",
    features: ["Structure ₹50 L", "Contents ₹10 L", "Earthquake and flood cover"],
  },
  {
    id: "group-health",
    kind: "group_health",
    name: "Group Mediclaim",
    insurer: "ICICI Lombard (via employer)",
    policyNo: "GMC-KA-2026-1183",
    cover: 500000,
    premium: 0,
    frequency: "Employer-paid",
    startedOn: "2023-04-01",
    renewsOn: "2027-04-01",
    insured: "Self",
    features: ["Ends when you leave Kestrel Analytics", "Cashless at network hospitals"],
  },
];

/* ───────────── Goals ───────────── */

export const GOALS: Goal[] = [
  {
    id: "g-emergency",
    name: "Emergency fund",
    kind: "emergency",
    target: 600000,
    targetDate: "2027-03-31",
    allocations: [
      { ref: { kind: "account", id: "idfc-sb" }, amount: 285000 },
      { ref: { kind: "account", id: "hdfc-fd" }, amount: 213640 },
    ],
    monthlyPlan: 15000,
    status: "behind",
    note: "Six months of essential spending and EMIs. Needs ₹25,340 a month from December to finish by March.",
  },
  {
    id: "g-retire",
    name: "Retirement at 58",
    kind: "retirement",
    target: 75000000,
    targetDate: "2050-06-30",
    allocations: [
      { ref: { kind: "holding", id: "epf" }, amount: 1482300 },
      { ref: { kind: "holding", id: "ppf" }, amount: 964500 },
      { ref: { kind: "holding", id: "nps" }, amount: 618200 },
      { ref: { kind: "holding", id: "ppfas" }, amount: 777997 },
      { ref: { kind: "holding", id: "uti-nifty" }, amount: 386590 },
    ],
    monthlyPlan: 63600,
    status: "on_track",
    note: "Target set in today's money terms in 2024. EPF contributions arrive via payroll and are not in the ledger.",
  },
  {
    id: "g-mba",
    name: "Executive MBA",
    kind: "education",
    target: 2500000,
    targetDate: "2028-07-01",
    allocations: [
      { ref: { kind: "holding", id: "hdfc-mid" }, amount: 301440 },
      { ref: { kind: "holding", id: "axis-small" }, amount: 167583 },
      { ref: { kind: "holding", id: "mirae-elss" }, amount: 169193 },
      { ref: { kind: "holding", id: "icici-corp" }, amount: 227718 },
    ],
    monthlyPlan: 12500,
    status: "behind",
    note: "One-year programme, fees plus living costs. Current SIPs cover about half of the gap.",
  },
  {
    id: "g-renovation",
    name: "Parents' home renovation",
    kind: "home",
    target: 800000,
    targetDate: "2027-12-31",
    allocations: [
      { ref: { kind: "account", id: "sbi-fd" }, amount: 154210 },
      { ref: { kind: "holding", id: "goldbees" }, amount: 187200 },
    ],
    monthlyPlan: 20000,
    status: "on_track",
    note: "Kitchen, bathrooms and waterproofing for the Mysuru house.",
  },
  {
    id: "g-japan",
    name: "Japan trip",
    kind: "travel",
    target: 350000,
    targetDate: "2027-10-15",
    allocations: [{ ref: { kind: "account", id: "icici-rd" }, amount: 143980 }],
    monthlyPlan: 10000,
    status: "on_track",
    note: "Two weeks in October 2027. The recurring deposit matures 12 days before departure.",
  },
  {
    id: "g-car",
    name: "Next car",
    kind: "vehicle",
    target: 1500000,
    targetDate: "2031-06-30",
    allocations: [{ ref: { kind: "holding", id: "mo-nasdaq" }, amount: 180290 }],
    monthlyPlan: 5000,
    status: "ahead",
    note: "Replace the Creta after the car loan closes in 2029, ideally without a new loan.",
  },
];

/* ───────────── Commitments (recurring obligations) ───────────── */

export const COMMITMENTS: Commitment[] = [
  { id: "c-home-emi", name: "Home loan EMI", kind: "emi", amount: 56409, variable: false, cadence: "Monthly", day: 5, payFromId: "hdfc-sb", autopay: true, categoryId: "emi", link: { kind: "loan", id: "home-loan" } },
  { id: "c-car-emi", name: "Car loan EMI", kind: "emi", amount: 18748, variable: false, cadence: "Monthly", day: 10, payFromId: "icici-sb", autopay: true, categoryId: "emi", link: { kind: "loan", id: "car-loan" } },
  { id: "c-edu-emi", name: "Education loan EMI", kind: "emi", amount: 4688, variable: false, cadence: "Monthly", day: 12, payFromId: "sbi-sb", autopay: true, categoryId: "emi", link: { kind: "loan", id: "edu-loan" } },
  { id: "c-family", name: "Repay father", kind: "emi", amount: 10000, variable: false, cadence: "Monthly", day: 15, payFromId: "hdfc-sb", autopay: false, categoryId: "emi", link: { kind: "loan", id: "family-loan" } },

  { id: "c-hdfc-cc", name: "HDFC Regalia Gold bill", kind: "card", amount: 0, variable: true, cadence: "Monthly", day: 28, payFromId: "hdfc-sb", autopay: false, categoryId: "card-payment", link: { kind: "card", id: "hdfc-cc" } },
  { id: "c-icici-cc", name: "ICICI Amazon Pay bill", kind: "card", amount: 0, variable: true, cadence: "Monthly", day: 18, payFromId: "icici-sb", autopay: true, categoryId: "card-payment", link: { kind: "card", id: "icici-cc" } },

  { id: "c-sip-ppfas", name: "SIP · Parag Parikh Flexi Cap", kind: "sip", amount: 15000, variable: false, cadence: "Monthly", day: 7, payFromId: "hdfc-sb", autopay: true, categoryId: "investments", link: { kind: "holding", id: "ppfas" } },
  { id: "c-sip-uti", name: "SIP · UTI Nifty 50 Index", kind: "sip", amount: 10000, variable: false, cadence: "Monthly", day: 7, payFromId: "hdfc-sb", autopay: true, categoryId: "investments", link: { kind: "holding", id: "uti-nifty" } },
  { id: "c-sip-mid", name: "SIP · HDFC Mid-Cap Opportunities", kind: "sip", amount: 7500, variable: false, cadence: "Monthly", day: 15, payFromId: "hdfc-sb", autopay: true, categoryId: "investments", link: { kind: "holding", id: "hdfc-mid" } },
  { id: "c-sip-axis", name: "SIP · Axis Small Cap", kind: "sip", amount: 5000, variable: false, cadence: "Monthly", day: 15, payFromId: "hdfc-sb", autopay: true, categoryId: "investments", link: { kind: "holding", id: "axis-small" } },
  { id: "c-sip-mo", name: "SIP · Motilal Oswal Nasdaq 100", kind: "sip", amount: 5000, variable: false, cadence: "Monthly", day: 21, payFromId: "hdfc-sb", autopay: true, categoryId: "investments", link: { kind: "holding", id: "mo-nasdaq" } },
  { id: "c-nps", name: "NPS Tier I contribution", kind: "sip", amount: 5000, variable: false, cadence: "Monthly", day: 25, payFromId: "hdfc-sb", autopay: true, categoryId: "investments", link: { kind: "holding", id: "nps" } },
  { id: "c-rd", name: "Recurring deposit installment", kind: "deposit", amount: 10000, variable: false, cadence: "Monthly", day: 3, payFromId: "icici-sb", autopay: true, categoryId: "investments", link: { kind: "account", id: "icici-rd" } },
  { id: "c-emergency", name: "Move to emergency fund", kind: "transfer", amount: 15000, variable: false, cadence: "Monthly", day: 3, payFromId: "hdfc-sb", autopay: true, categoryId: "transfer", link: { kind: "goal", id: "g-emergency" } },

  { id: "c-cook", name: "Cook's salary", kind: "household", amount: 9000, variable: false, cadence: "Monthly", day: 1, payFromId: "icici-sb", autopay: false, categoryId: "household" },
  { id: "c-maint", name: "Society maintenance", kind: "household", amount: 4800, variable: false, cadence: "Monthly", day: 10, payFromId: "icici-sb", autopay: false, categoryId: "home", link: { kind: "asset", id: "apartment" } },
  { id: "c-bescom", name: "BESCOM electricity", kind: "utility", amount: 2214, variable: true, cadence: "Monthly", day: 20, payFromId: "icici-sb", autopay: false, categoryId: "utilities" },
  { id: "c-water", name: "BWSSB water", kind: "utility", amount: 420, variable: true, cadence: "Monthly", day: 18, payFromId: "icici-sb", autopay: false, categoryId: "utilities" },
  { id: "c-gas", name: "Piped gas", kind: "utility", amount: 1100, variable: true, cadence: "Bi-monthly", day: 9, payFromId: "icici-sb", autopay: false, categoryId: "utilities" },
  { id: "c-act", name: "ACT Fibernet", kind: "utility", amount: 1179, variable: false, cadence: "Monthly", day: 8, payFromId: "hdfc-cc", autopay: true, categoryId: "utilities" },
  { id: "c-airtel", name: "Airtel postpaid", kind: "utility", amount: 699, variable: false, cadence: "Monthly", day: 14, payFromId: "icici-cc", autopay: true, categoryId: "utilities" },

  { id: "c-netflix", name: "Netflix", kind: "subscription", amount: 649, variable: false, cadence: "Monthly", day: 2, payFromId: "hdfc-cc", autopay: true, categoryId: "entertainment" },
  { id: "c-icloud", name: "iCloud+ 200 GB", kind: "subscription", amount: 75, variable: false, cadence: "Monthly", day: 11, payFromId: "hdfc-cc", autopay: true, categoryId: "entertainment" },
  { id: "c-spotify", name: "Spotify Premium", kind: "subscription", amount: 139, variable: false, cadence: "Monthly", day: 19, payFromId: "icici-cc", autopay: true, categoryId: "entertainment" },
  { id: "c-youtube", name: "YouTube Premium", kind: "subscription", amount: 149, variable: false, cadence: "Monthly", day: 24, payFromId: "hdfc-cc", autopay: true, categoryId: "entertainment" },

  { id: "c-ins-car", name: "Car insurance renewal", kind: "insurance", amount: 21350, variable: false, cadence: "Yearly", day: 12, payFromId: "hdfc-cc", autopay: false, categoryId: "insurance", link: { kind: "policy", id: "car-ins" } },
  { id: "c-ins-health", name: "Health insurance renewal", kind: "insurance", amount: 18640, variable: false, cadence: "Yearly", day: 6, payFromId: "hdfc-cc", autopay: false, categoryId: "insurance", link: { kind: "policy", id: "health-self" } },
  { id: "c-ins-term", name: "Term life premium", kind: "insurance", amount: 21480, variable: false, cadence: "Yearly", day: 14, payFromId: "hdfc-sb", autopay: true, categoryId: "insurance", link: { kind: "policy", id: "term" } },
];
