/**
 * Read-side selectors over the demonstration data. Components depend on these
 * functions (and the types), never on how fixtures are produced, so a future
 * API can replace the fixtures without touching the UI.
 */
import type {
  AssetClass,
  AttentionItem,
  CashAccount,
  Category,
  EntityRef,
  ISODate,
  MonthFlow,
  MonthKey,
  NetWorthSnapshot,
  Occurrence,
  ScheduleRow,
  Transaction,
} from "../types";
import { addMonths, daysInMonth, diffDays, formatDate, monthOf, parts } from "../format";
import {
  AS_OF,
  ASSETS,
  buildSchedule,
  CARD_OPENING,
  CARDS,
  CASH_ACCOUNTS,
  CATEGORIES,
  COMMITMENTS,
  DATA_START,
  GOALS,
  HOLDINGS,
  LOANS,
  POLICIES,
  PROFILE,
  SIPS,
} from "./core";
import { CALENDAR_MONTHS, OCCURRENCES, STATEMENTS, TRANSACTIONS } from "./ledger";
import { CARD_REWARDS } from "./card-rewards";
import { EQUITY_MARKET_INPUTS, EQUITY_PLANS } from "./employee-equity";

export {
  CALENDAR_MONTHS,
  CARD_REWARDS,
  EQUITY_MARKET_INPUTS,
  EQUITY_PLANS,
  AS_OF,
  ASSETS,
  CARDS,
  CASH_ACCOUNTS,
  CATEGORIES,
  COMMITMENTS,
  GOALS,
  HOLDINGS,
  LOANS,
  OCCURRENCES,
  POLICIES,
  PROFILE,
  SIPS,
  STATEMENTS,
  TRANSACTIONS,
};

export const DATA_START_DATE = DATA_START;

/** The month containing AS_OF. Screens derive "this month" from it, never from a literal. */
export const AS_OF_MONTH: MonthKey = monthOf(AS_OF);

/** Days after AS_OF until the month ends. */
export const DAYS_LEFT_IN_MONTH = daysInMonth(parts(AS_OF).y, parts(AS_OF).m) - parts(AS_OF).d;

/** Every month from `from` to `to`, inclusive. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = from; m <= to; m = monthOf(addMonths(`${m}-01`, 1))) out.push(m);
  return out;
}

/** Months covered by the transaction ledger, oldest first. */
const LEDGER_MONTHS = monthRange(monthOf(DATA_START), AS_OF_MONTH);

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const accountMap = byId(CASH_ACCOUNTS);
const cardMap = byId(CARDS);
const loanMap = byId(LOANS);
const holdingMap = byId(HOLDINGS);
const assetMap = byId(ASSETS);
const policyMap = byId(POLICIES);
const goalMap = byId(GOALS);
const commitmentMap = byId(COMMITMENTS);
const categoryMap = byId(CATEGORIES);

export const getAccount = (id: string) => accountMap.get(id);
export const getCard = (id: string) => cardMap.get(id);
export const getLoan = (id: string) => loanMap.get(id);
export const getHolding = (id: string) => holdingMap.get(id);
export const getAsset = (id: string) => assetMap.get(id);
export const getPolicy = (id: string) => policyMap.get(id);
export const getGoal = (id: string) => goalMap.get(id);
export const getCommitment = (id: string) => commitmentMap.get(id);
export const getCategory = (id: string): Category =>
  categoryMap.get(id) ?? { id, name: id, group: "lifestyle" };

/* ───────────── Ledger accounts (cash accounts + cards) ───────────── */

export function ledgerAccountName(id: string, { withMask = true } = {}): string {
  const a = accountMap.get(id);
  if (a) return withMask && a.mask ? `${a.name} ••${a.mask}` : a.name;
  const c = cardMap.get(id);
  if (c) return withMask ? `${c.name} ••${c.mask}` : c.name;
  return id;
}

export function ledgerAccountShort(id: string): string {
  const a = accountMap.get(id);
  if (a) {
    if (a.kind === "cash") return "Cash";
    const bank = a.institution === "State Bank of India" ? "SBI" : a.institution.replace(" Bank", "");
    return `${bank} ${a.kind === "fd" ? "FD" : a.kind === "rd" ? "RD" : "Savings"}`;
  }
  const c = cardMap.get(id);
  if (c) return c.name.replace("HDFC ", "").replace("ICICI ", "");
  return id;
}

export const ledgerAccountIds = [
  ...CASH_ACCOUNTS.filter((a) => a.kind === "savings" || a.kind === "cash").map((a) => a.id),
  ...CARDS.map((c) => c.id),
];

/** Signed amount from the point of view of `accountId` (+ money in, − money out) */
export function amountFor(t: Transaction, accountId: string): number {
  if (t.accountId === accountId) return t.amount;
  if (t.counterpartyId === accountId) return -t.amount;
  return 0;
}

export function touches(t: Transaction, accountId: string) {
  return t.accountId === accountId || t.counterpartyId === accountId;
}

export interface LedgerRow {
  txn: Transaction;
  amount: number;
  balance: number;
}

/**
 * Account ledger with running balance. Bank balances are fixed as of AS_OF and
 * walked backwards; card balances start from the opening outstanding.
 * `extra` are transactions added in this session (they adjust balances).
 */
export function accountLedger(accountId: string, txns: Transaction[] = TRANSACTIONS): LedgerRow[] {
  const rows = txns.filter((t) => touches(t, accountId)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const card = cardMap.get(accountId);
  const out: LedgerRow[] = [];
  if (card) {
    let bal = -CARD_OPENING[accountId];
    for (const t of rows) {
      const amt = amountFor(t, accountId);
      bal += amt;
      out.push({ txn: t, amount: amt, balance: bal });
    }
    return out.reverse();
  }
  const acct = accountMap.get(accountId);
  let bal = (acct?.balance ?? 0) + sessionDelta(accountId, txns);
  for (let i = rows.length - 1; i >= 0; i--) {
    const amt = amountFor(rows[i], accountId);
    out.push({ txn: rows[i], amount: amt, balance: bal });
    bal -= amt;
  }
  return out;
}

function sessionDelta(accountId: string, txns: Transaction[]) {
  return txns.filter((t) => t.source === "manual" && touches(t, accountId)).reduce((s, t) => s + amountFor(t, accountId), 0);
}

export function accountBalance(accountId: string, txns: Transaction[] = TRANSACTIONS): number {
  const card = cardMap.get(accountId);
  if (card) return -cardStatus(accountId, txns).outstanding;
  return (accountMap.get(accountId)?.balance ?? 0) + sessionDelta(accountId, txns);
}

/* ───────────── Cards ───────────── */

function getCardCommitment(cardId: string) {
  return COMMITMENTS.find((c) => c.kind === "card" && c.link?.id === cardId);
}

export function cardBillPayments(id: string, cardId: string, txns: Transaction[]) {
  return txns.filter((t) =>
    t.occurrenceId === id && t.counterpartyId === cardId && t.status === "cleared" &&
    (t.type === "card_payment" || t.type === "transfer") && t.amount < 0,
  );
}

export function remainingBillAmount(occurrence: Occurrence, txns: Transaction[]): number {
  const commitment = commitmentMap.get(occurrence.commitmentId);
  if (commitment?.kind !== "card" || !commitment.link) return occurrence.amount;
  const paid = cardBillPayments(occurrence.id, commitment.link.id, txns).reduce((sum, t) => sum - t.amount, 0);
  return Math.max(0, Math.round((occurrence.amount - paid) * 100) / 100);
}

export function cardStatus(cardId: string, txns: Transaction[] = TRANSACTIONS) {
  const card = cardMap.get(cardId)!;
  const commitment = getCardCommitment(cardId);
  const rows = accountLedger(cardId, txns);
  const outstanding = Math.round(-(rows[0]?.balance ?? -CARD_OPENING[cardId]) * 100) / 100;
  const statements = STATEMENTS.filter((s) => s.cardId === cardId).map((s) => {
    const payments = cardBillPayments(`${commitment?.id}@${s.due}`, cardId, txns);
    const paid = Math.round(payments.reduce((sum, t) => sum - t.amount, 0) * 100) / 100;
    const remaining = Math.max(0, Math.round((s.amount - paid) * 100) / 100);
    const minimumRemaining = s.minimumDue === undefined ? undefined : Math.min(remaining, Math.max(0, Math.round((s.minimumDue - paid) * 100) / 100));
    const paidOn = remaining === 0 ? payments.reduce<ISODate | undefined>((latest, t) => !latest || t.date > latest ? t.date : latest, undefined) : undefined;
    return { ...s, paidOn, paid, remaining, minimumRemaining, payments };
  });
  const last = statements[statements.length - 1];
  const unpaid = statements.reduce((sum, s) => sum + s.remaining, 0);
  const unbilled = Math.max(0, Math.round((outstanding - unpaid) * 100) / 100);
  const nextStatement = addMonths(AS_OF, Number(AS_OF.slice(8)) >= card.statementDay ? 1 : 0, card.statementDay);
  return {
    card,
    commitment,
    outstanding,
    lastStatement: last,
    nextStatement,
    statementDue: unpaid,
    unbilled,
    available: card.limit - outstanding,
    utilization: outstanding / card.limit,
    statements,
  };
}

/* ───────────── Loans ───────────── */

const scheduleCache = new Map<string, ScheduleRow[]>();
export function loanSchedule(id: string): ScheduleRow[] {
  if (!scheduleCache.has(id)) scheduleCache.set(id, buildSchedule(loanMap.get(id)!));
  return scheduleCache.get(id)!;
}

export function loanStatus(id: string) {
  const loan = loanMap.get(id)!;
  const rows = loanSchedule(id);
  const paid = rows.filter((r) => r.date <= AS_OF);
  const next = rows.find((r) => r.date > AS_OF);
  const outstanding = paid.length ? paid[paid.length - 1].balance : loan.principal;
  const interestPaid = paid.reduce((s, r) => s + r.interest, 0);
  const interestRemaining = rows.filter((r) => r.date > AS_OF).reduce((s, r) => s + r.interest, 0);
  return {
    loan,
    outstanding,
    paidCount: paid.length,
    remainingCount: rows.length - paid.length,
    next,
    endDate: rows[rows.length - 1].date,
    principalRepaid: loan.principal - outstanding,
    progress: (loan.principal - outstanding) / loan.principal,
    interestPaid,
    interestRemaining,
  };
}

/* ───────────── Investments ───────────── */

export const ASSET_CLASSES: { id: AssetClass; name: string; slot: number }[] = [
  { id: "mf", name: "Equity mutual funds", slot: 1 },
  { id: "equity", name: "Indian equity", slot: 2 },
  { id: "international", name: "International", slot: 3 },
  { id: "gold", name: "Gold", slot: 4 },
  { id: "retirement", name: "Retirement (EPF, PPF, NPS)", slot: 5 },
  { id: "debt", name: "Debt & bonds", slot: 6 },
];

export function portfolioSummary() {
  const byClass = ASSET_CLASSES.map((c) => {
    const hs = HOLDINGS.filter((h) => h.assetClass === c.id);
    const invested = hs.reduce((s, h) => s + h.invested, 0);
    const current = hs.reduce((s, h) => s + h.current, 0);
    return { ...c, invested, current, gain: current - invested, count: hs.length };
  });
  const invested = byClass.reduce((s, c) => s + c.invested, 0);
  const current = byClass.reduce((s, c) => s + c.current, 0);
  const dayChange = HOLDINGS.reduce((s, h) => s + (h.current * (h.dayChangePct ?? 0)) / (100 + (h.dayChangePct ?? 0)), 0);
  return { byClass, invested, current, gain: current - invested, dayChange: Math.round(dayChange), xirr: 13.4 };
}

/* ───────────── Net worth ───────────── */

export function netWorthNow(txns: Transaction[] = TRANSACTIONS): NetWorthSnapshot & {
  netWorth: number;
  assets: number;
  liquid: number;
  deposits: number;
  loans: number;
  cards: number;
} {
  const liquid = CASH_ACCOUNTS.filter((a) => a.liquid).reduce((s, a) => s + accountBalance(a.id, txns), 0);
  const deposits = CASH_ACCOUNTS.filter((a) => !a.liquid).reduce((s, a) => s + a.balance, 0);
  const investments = HOLDINGS.filter((h) => h.assetClass !== "retirement").reduce((s, h) => s + h.current, 0);
  const retirement = HOLDINGS.filter((h) => h.assetClass === "retirement").reduce((s, h) => s + h.current, 0);
  const realEstate = ASSETS.filter((a) => a.kind === "real_estate").reduce((s, a) => s + a.currentValue, 0);
  const vehicles = ASSETS.filter((a) => a.kind === "vehicle").reduce((s, a) => s + a.currentValue, 0);
  const gold = ASSETS.filter((a) => a.kind === "gold").reduce((s, a) => s + a.currentValue, 0);
  const loans = LOANS.reduce((s, l) => s + loanStatus(l.id).outstanding, 0);
  const cards = CARDS.reduce((s, c) => s + cardStatus(c.id, txns).outstanding, 0);
  const cash = liquid + deposits;
  const assets = cash + investments + retirement + realEstate + vehicles + gold;
  const liabilities = loans + cards;
  return {
    month: monthOf(AS_OF),
    cash,
    liquid,
    deposits,
    investments,
    retirement,
    realEstate,
    vehicles,
    gold,
    liabilities,
    loans,
    cards,
    assets,
    netWorth: assets - liabilities,
  };
}

const HISTORY_MONTHS = [
  "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07",
  "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
  "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
];
const H = {
  cash: [972000, 964000, 1037000, 979000, 1049000, 1040000, 1014000, 1084000, 1035000, 1100000, 1064000, 1079000, 1138000, 1206000, 1121000, 1147000, 1218000, 1278000, 1237000, 1223000, 1323000, 1195000, 1332000],
  investments: [3455000, 3501000, 3378000, 3358000, 3511000, 3590000, 3941000, 4024000, 4043000, 4151000, 4121000, 4191000, 4293000, 4469000, 4485000, 4531000, 4665000, 4706000, 4742000, 4933000, 4983000, 4942000, 5097000],
  retirement: [2216000, 2258000, 2290000, 2318000, 2366000, 2385000, 2426000, 2468000, 2492000, 2534000, 2560000, 2609000, 2646000, 2677000, 2719000, 2743000, 2786000, 2820000, 2855000, 2887000, 2932000, 2970000, 2994000],
  realEstate: [12600000, 12600000, 12600000, 12600000, 13000000, 13000000, 13000000, 13000000, 13000000, 13000000, 13300000, 13300000, 13300000, 13300000, 13300000, 13300000, 13600000, 13600000, 13600000, 13600000, 13600000, 13600000, 13600000],
  vehicles: [1449000, 1438000, 1426000, 1415000, 1404000, 1392000, 1381000, 1370000, 1359000, 1348000, 1336000, 1325000, 1314000, 1302000, 1291000, 1280000, 1269000, 1258000, 1246000, 1235000, 1224000, 1212000, 1201000],
  gold: [694000, 686000, 714000, 722000, 741000, 746000, 739000, 752000, 770000, 759000, 782000, 782000, 790000, 797000, 829000, 818000, 831000, 845000, 871000, 853000, 875000, 888000, 909000],
  liabilities: [7008000, 6979000, 6937000, 6918000, 6876000, 6841000, 6818000, 6776000, 6738000, 6702000, 6667000, 6637000, 6803000, 6763000, 6734000, 6677000, 6626000, 6599000, 6559000, 6503000, 6463000, 6420000, 6368000],
};

export function netWorthHistory(txns: Transaction[] = TRANSACTIONS) {
  const now = netWorthNow(txns);
  const past = HISTORY_MONTHS.map((month, i) => ({
    month,
    cash: H.cash[i],
    investments: H.investments[i],
    retirement: H.retirement[i],
    realEstate: H.realEstate[i],
    vehicles: H.vehicles[i],
    gold: H.gold[i],
    liabilities: H.liabilities[i],
  }));
  return [...past, now].map((s) => ({
    ...s,
    assets: s.cash + s.investments + s.retirement + s.realEstate + s.vehicles + s.gold,
    netWorth: s.cash + s.investments + s.retirement + s.realEstate + s.vehicles + s.gold - s.liabilities,
  }));
}

/** Net worth now against the end of the previous month. */
export function netWorthChange(txns: Transaction[] = TRANSACTIONS): { amount: number; pct: number; sinceMonth: MonthKey } {
  const hist = netWorthHistory(txns);
  const prev = hist[hist.length - 2];
  const amount = hist[hist.length - 1].netWorth - prev.netWorth;
  return { amount, pct: (amount / prev.netWorth) * 100, sinceMonth: prev.month };
}

/* ───────────── Cash flow ───────────── */

const PAST_FLOWS: MonthFlow[] = [
  { month: "2025-12", income: 241010, spending: 96400, emis: 89845, invested: 57500 },
  { month: "2026-01", income: 246650, spending: 84200, emis: 89845, invested: 57500 },
  { month: "2026-02", income: 238600, spending: 78900, emis: 89845, invested: 57500 },
  { month: "2026-03", income: 246400, spending: 88300, emis: 89845, invested: 57500 },
  { month: "2026-04", income: 243100, spending: 82600, emis: 89845, invested: 207500 },
];

export function flowForMonth(month: MonthKey, txns: Transaction[] = TRANSACTIONS): MonthFlow {
  let income = 0, spending = 0, emis = 0, invested = 0;
  for (const t of txns) {
    if (monthOf(t.date) !== month) continue;
    if (t.type === "income" || t.type === "dividend" || t.type === "interest") income += t.amount;
    else if (t.type === "expense" || t.type === "refund") spending -= t.amount;
    else if (t.type === "emi") emis -= t.amount;
    else if (t.type === "investment") invested -= t.amount;
  }
  return { month, income, spending, emis, invested };
}

export function monthFlows(txns: Transaction[] = TRANSACTIONS): MonthFlow[] {
  const recent = LEDGER_MONTHS.map((m) => flowForMonth(m, txns));
  return [...PAST_FLOWS, ...recent];
}

/* ───────────── Budgets ───────────── */

export interface BudgetLine {
  category: Category;
  budget: number;
  actual: number;
  ratio: number;
  remaining: number;
  count: number;
}

export function budgetFor(month: MonthKey, txns: Transaction[] = TRANSACTIONS): BudgetLine[] {
  return CATEGORIES.filter((c) => c.budget).map((category) => {
    const rows = txns.filter((t) => t.categoryId === category.id && monthOf(t.date) === month && (t.type === "expense" || t.type === "refund"));
    const actual = -rows.reduce((s, t) => s + t.amount, 0);
    return {
      category,
      budget: category.budget!,
      actual,
      ratio: actual / category.budget!,
      remaining: category.budget! - actual,
      count: rows.length,
    };
  });
}

export const BUDGET_MONTHS: MonthKey[] = LEDGER_MONTHS;

/* ───────────── Commitments ───────────── */

export function commitmentPayer(id: string) {
  return ledgerAccountName(id);
}

export function upcomingOccurrences(days = 30) {
  return OCCURRENCES.filter((o) => o.status !== "paid" && diffDays(o.date, AS_OF) <= days);
}

/* ───────────── Goals ───────────── */

export function goalProgress(goalId: string) {
  const g = goalMap.get(goalId)!;
  const saved = g.allocations.reduce((s, a) => s + a.amount, 0);
  return { goal: g, saved, ratio: saved / g.target, gap: g.target - saved };
}

/* ───────────── Attention ───────────── */

export function attentionItems(txns: Transaction[] = TRANSACTIONS, paidIds: Set<string> = new Set(), reminderDays = 7): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const o of OCCURRENCES) {
    if (paidIds.has(o.id)) continue;
    const c = commitmentMap.get(o.commitmentId)!;
    const amount = c.kind === "card" ? remainingBillAmount(o, txns) : o.amount;
    if (o.status === "overdue") {
      items.push({
        id: `att-${o.id}`,
        severity: "critical",
        title: `${c.name} overdue`,
        detail: `${formatAmount(amount)} was due ${formatDate(o.date, "d MMM")}. Pay from ${ledgerAccountShort(c.payFromId)} to avoid a late fee.`,
        date: o.date,
        ref: { kind: "commitment", id: o.id },
        action: "Mark as paid",
      });
    } else if (o.status === "due" && diffDays(o.date, AS_OF) <= reminderDays) {
      items.push({
        id: `att-${o.id}`,
        severity: "warning",
        title: `${c.name} due ${formatDate(o.date, "d MMM")}`,
        detail: `${formatAmount(amount)} in ${diffDays(o.date, AS_OF)} days. Autopay is off.`,
        date: o.date,
        ref: c.kind === "card" ? (c.link as EntityRef) : { kind: "commitment", id: o.id },
        action: "Review bill",
      });
    }
  }
  const overspent = budgetFor(AS_OF_MONTH, txns)
    .filter((b) => b.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 2);
  for (const b of overspent) {
    {
      items.push({
        id: `att-budget-${b.category.id}`,
        severity: "warning",
        title: `${b.category.name} at ${Math.round(b.ratio * 100)}% of budget`,
        detail: `${formatAmount(b.actual)} spent of ${formatAmount(b.budget)}, with ${DAYS_LEFT_IN_MONTH} days of the month left.`,
        ref: { kind: "category", id: b.category.id },
        action: "See transactions",
      });
    }
  }
  const car = policyMap.get("car-ins")!;
  items.push({
    id: "att-car-ins",
    severity: "warning",
    title: "Car insurance renews 12 Dec",
    detail: `${formatAmount(car.premium)} premium, no autopay. Compare quotes before the no-claim bonus resets.`,
    date: car.renewsOn,
    ref: { kind: "policy", id: car.id },
    action: "Open policy",
  });
  const fd = accountMap.get("hdfc-fd")!;
  items.push({
    id: "att-fd",
    severity: "info",
    title: "HDFC fixed deposit matures 03 Dec",
    detail: `${formatAmount(fd.maturityAmount!)} returns to HDFC Savings unless you renew. It is part of the emergency fund.`,
    date: fd.maturityDate,
    ref: { kind: "account", id: fd.id },
    action: "Open deposit",
  });
  items.push({
    id: "att-goal-emergency",
    severity: "info",
    title: "Emergency fund is behind plan",
    detail: "83% funded. Needs ₹25,340 a month from December to reach ₹6 L by March.",
    ref: { kind: "goal", id: "g-emergency" },
    action: "Open goal",
  });
  const order = { critical: 0, warning: 1, info: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}

function formatAmount(n: number) {
  // Local import-free formatter for attention copy (Indian grouping, no decimals)
  const s = Math.round(n).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return "₹" + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3);
}

/* ───────────── Entity naming & routing ───────────── */

export function entityName(ref: EntityRef): string {
  switch (ref.kind) {
    case "account":
      return ledgerAccountName(ref.id);
    case "card":
      return ledgerAccountName(ref.id);
    case "loan":
      return `${loanMap.get(ref.id)?.name} · ${loanMap.get(ref.id)?.lender}`;
    case "holding":
      return holdingMap.get(ref.id)?.name ?? ref.id;
    case "asset":
      return assetMap.get(ref.id)?.name ?? ref.id;
    case "policy": {
      const p = policyMap.get(ref.id);
      return p ? `${p.insurer} ${p.name}` : ref.id;
    }
    case "goal":
      return goalMap.get(ref.id)?.name ?? ref.id;
    case "commitment":
      return commitmentMap.get(ref.id.split("@")[0])?.name ?? ref.id;
    case "category":
      return getCategory(ref.id).name;
    case "transaction":
      return TRANSACTIONS.find((t) => t.id === ref.id)?.description ?? ref.id;
  }
}

export function entityHref(ref: EntityRef): string {
  switch (ref.kind) {
    case "account":
      return `/accounts/${ref.id}`;
    case "card":
      return `/credit-cards/${ref.id}`;
    case "loan":
      return `/liabilities/${ref.id}`;
    case "holding":
      return `/investments?h=${ref.id}`;
    case "asset":
      return `/net-worth`;
    case "policy":
      return `/insurance`;
    case "goal":
      return `/goals`;
    case "commitment":
      return `/calendar`;
    case "category":
      return `/transactions?category=${ref.id}`;
    case "transaction":
      return `/transactions`;
  }
}

export function isCashAccount(a: CashAccount | undefined): a is CashAccount {
  return Boolean(a);
}

export const dataNote = `Demonstration data · as of ${formatDate(AS_OF, "d MMM yyyy")}`;

export function daysFromAsOf(date: ISODate) {
  return diffDays(date, AS_OF);
}
