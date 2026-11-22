/**
 * Domain types for Arthashala. These describe records the way a future API
 * would return them; UI components depend on these types, never on how the
 * mock data is produced.
 */

export type ISODate = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM
export type CurrencyCode = "INR";

/* ── Ledger accounts (things that hold or owe money and carry transactions) ── */

export type CashAccountKind = "savings" | "current" | "cash" | "fd" | "rd";

export interface CashAccount {
  id: string;
  kind: CashAccountKind;
  name: string;
  institution: string;
  mask?: string; // last 4 digits
  currency: CurrencyCode;
  balance: number; // as-of balance (for FD/RD: current value incl. accrued interest)
  role: string; // why the account exists, in the user's words
  interestRate?: number; // % p.a.
  openedOn: ISODate;
  /** Deposits only */
  principal?: number;
  maturityDate?: ISODate;
  maturityAmount?: number;
  installment?: number; // RD monthly installment
  installmentsPaid?: number;
  installmentsTotal?: number;
  liquid: boolean; // available without breaking a deposit
  goalId?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  institution: string;
  network: "Visa" | "Mastercard" | "RuPay" | "Amex";
  mask: string;
  currency: CurrencyCode;
  limit: number;
  statementDay: number; // day of month the statement generates
  dueDay: number; // day of month payment is due
  rewardPoints: number;
  autopayFrom?: string; // cash account id
}

export type LoanKind = "home" | "car" | "education" | "personal" | "family";

export interface Loan {
  id: string;
  kind: LoanKind;
  name: string;
  lender: string;
  mask?: string;
  currency: CurrencyCode;
  principal: number; // sanctioned / original amount
  rate: number; // % p.a.
  rateType: "Floating" | "Fixed" | "Interest-free";
  tenureMonths: number;
  emi: number;
  emiDay: number;
  firstEmi: ISODate;
  debitAccountId: string;
  assetId?: string; // what the loan financed
  note?: string;
}

export interface ScheduleRow {
  n: number;
  date: ISODate;
  emi: number;
  principal: number;
  interest: number;
  balance: number; // closing balance after this installment
}

/* ── Investments ── */

export type AssetClass =
  | "mf"
  | "equity"
  | "international"
  | "gold"
  | "retirement"
  | "debt";

export interface Holding {
  id: string;
  assetClass: AssetClass;
  type: string; // e.g. "Flexi cap fund", "Large cap stock", "Sovereign Gold Bond"
  name: string;
  symbol?: string; // ticker or folio
  platform: string; // where it's held
  units?: number;
  avgCost?: number;
  price?: number; // latest NAV / price (as-of)
  invested: number;
  current: number;
  dayChangePct?: number;
  xirr?: number; // predetermined, % p.a.
  sipId?: string;
  goalId?: string;
  lockIn?: string;
  note?: string;
}

export interface Sip {
  id: string;
  holdingId: string;
  amount: number;
  day: number;
  debitAccountId: string;
  startedOn: ISODate;
  kind: "SIP" | "RD" | "NPS" | "PPF";
}

/* ── Physical assets ── */

export interface PhysicalAsset {
  id: string;
  kind: "real_estate" | "vehicle" | "gold";
  name: string;
  detail: string;
  acquiredOn: ISODate;
  cost: number;
  currentValue: number;
  valuationNote: string;
  loanId?: string;
  policyId?: string;
}

/* ── Insurance ── */

export interface Policy {
  id: string;
  kind: "health" | "term" | "vehicle" | "home" | "parents_health" | "group_health";
  name: string;
  insurer: string;
  policyNo: string;
  cover: number;
  premium: number; // annual
  frequency: "Yearly" | "Employer-paid";
  startedOn: ISODate;
  renewsOn: ISODate;
  insured: string;
  nominee?: string;
  assetId?: string;
  payFromId?: string;
  features: string[];
}

/* ── Goals ── */

export interface GoalAllocation {
  ref: { kind: "account" | "holding"; id: string };
  amount: number; // portion of the resource earmarked for this goal
}

export interface Goal {
  id: string;
  name: string;
  kind: "emergency" | "retirement" | "travel" | "education" | "home" | "vehicle";
  target: number;
  targetDate: ISODate;
  allocations: GoalAllocation[];
  monthlyPlan: number;
  status: "on_track" | "behind" | "ahead";
  note: string;
}

/* ── Categories, budgets, transactions ── */

export type CategoryGroup = "income" | "essentials" | "lifestyle" | "commitments" | "transfers";

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
  budget?: number; // monthly budget (spending categories only)
}

export type TxnType =
  | "income"
  | "expense"
  | "transfer"
  | "investment"
  | "emi"
  | "card_payment"
  | "refund"
  | "interest"
  | "dividend";

export type PaymentMethod =
  | "UPI"
  | "Card"
  | "NEFT"
  | "IMPS"
  | "NACH"
  | "Auto-debit"
  | "Cash"
  | "Netbanking"
  | "ATM";

export interface Transaction {
  id: string;
  date: ISODate;
  description: string; // merchant or counterparty as shown on the statement
  amount: number; // signed, from the perspective of accountId (+ in, − out)
  type: TxnType;
  categoryId: string;
  accountId: string; // cash account or credit card id
  counterpartyId?: string; // the other side of a transfer / payment
  method: PaymentMethod;
  commitmentId?: string;
  link?: EntityRef; // loan, holding, policy… this transaction belongs to
  note?: string;
  source: "imported" | "manual";
  status: "cleared" | "pending";
}

/* ── Commitments (recurring obligations) and their dated occurrences ── */

export type CommitmentKind =
  | "emi"
  | "card"
  | "sip"
  | "utility"
  | "subscription"
  | "insurance"
  | "household"
  | "transfer"
  | "deposit";

export interface Commitment {
  id: string;
  name: string;
  kind: CommitmentKind;
  amount: number; // expected amount (latest for variable bills)
  variable: boolean;
  cadence: "Monthly" | "Bi-monthly" | "Quarterly" | "Yearly";
  day: number;
  payFromId: string; // account or card that pays
  autopay: boolean;
  categoryId: string;
  link?: EntityRef;
}

export type OccurrenceStatus = "paid" | "due" | "overdue" | "scheduled";

export interface Occurrence {
  id: string;
  commitmentId: string;
  date: ISODate;
  amount: number;
  status: OccurrenceStatus;
  paidOn?: ISODate;
  txnId?: string;
}

/* ── History ── */

export interface NetWorthSnapshot {
  month: MonthKey;
  cash: number; // bank + cash + deposits
  investments: number; // market-linked holdings
  retirement: number; // EPF, PPF, NPS
  realEstate: number;
  vehicles: number;
  gold: number; // physical gold
  liabilities: number; // loans + card outstanding (positive number)
}

export interface MonthFlow {
  month: MonthKey;
  income: number;
  spending: number; // discretionary + essential expenses
  emis: number;
  invested: number;
}

/* ── Cross-module references ── */

export type EntityKind =
  | "account"
  | "card"
  | "loan"
  | "holding"
  | "asset"
  | "policy"
  | "goal"
  | "commitment"
  | "transaction"
  | "category";

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

export interface AttentionItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  date?: ISODate;
  ref: EntityRef;
  action: string;
}
