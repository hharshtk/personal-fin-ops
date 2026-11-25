import type { EquityActivity, EquityMarketInput, EquityPlan, EsopGrant, EsppPeriod, ISODate } from "./types";
import { CURRENCY_CODES } from "./currencies";
import { formatDate, fromUTC, toUTC } from "./format";

export const EQUITY_CURRENCIES = CURRENCY_CODES;
export const EQUITY_PRECISION = 8;
export const EQUITY_MAX_AMOUNT = 1e9;
export const EQUITY_MAX_UNITS = 1e7;

export const equityUnits = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: EQUITY_PRECISION });
export const nativeMoney = (value: number, currency: string) =>
  value.toLocaleString(currency === "INR" ? "en-IN" : "en", { style: "currency", currencyDisplay: currency === "INR" ? "symbol" : "code", currency, maximumFractionDigits: EQUITY_PRECISION });
const rounded = (value: number, digits = EQUITY_PRECISION) => Number(value.toFixed(digits));
const currencyDigits = (currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;

export const equityActivityLabels = {
  exercise: "Exercise",
  contribution: "Payroll contribution",
  purchase: "Purchase",
  sale: "Share sale",
} as const;

const activityOrder = { contribution: 0, exercise: 1, purchase: 1, sale: 2 };
export function orderedEquityActivity(activity: readonly EquityActivity[]) {
  return [...activity].sort((a, b) => a.date.localeCompare(b.date) || activityOrder[a.kind] - activityOrder[b.kind]);
}

function sharesDelta(record: EquityActivity) {
  switch (record.kind) {
    case "exercise": return record.options;
    case "purchase": return record.shares;
    case "sale": return -record.shares;
    case "contribution": return 0;
  }
}

export function purchaseCost(record: Pick<Extract<EquityActivity, { kind: "purchase" }>, "shares" | "price">, currency: string) {
  return rounded(record.shares * record.price, currencyDigits(currency));
}

function contributionDelta(record: EquityActivity, currency: string) {
  if (record.kind === "contribution") return record.amount;
  if (record.kind === "purchase") return -purchaseCost(record, currency);
  return 0;
}

export function equitySecurityKey(plan: Pick<EquityPlan, "id" | "ticker" | "exchange" | "currency" | "market">) {
  return plan.ticker && plan.exchange
    ? JSON.stringify([plan.ticker.toUpperCase(), plan.exchange.toUpperCase(), plan.currency, plan.market])
    : JSON.stringify([plan.id, plan.currency]);
}

export function equitySymbol(plan: EquityPlan) {
  return [plan.ticker, plan.exchange].filter(Boolean).join(" · ");
}

export function latestEquityInput(inputs: EquityMarketInput[], kind: EquityMarketInput["kind"], key: string, asOf: ISODate) {
  return inputs.reduce<EquityMarketInput | undefined>((latest, input) =>
    input.kind === kind && input.key === key && input.date <= asOf && (!latest || input.date > latest.date) ? input : latest, undefined);
}

export function grantBalances(grant: EsopGrant, asOf: ISODate) {
  return grant.tranches.map((tranche) => {
    const exercised = grant.activity.reduce((total, record) =>
      record.kind === "exercise" && record.trancheId === tranche.id && record.date <= asOf ? total + record.options : total, 0);
    const remaining = tranche.options - exercised;
    return {
      ...tranche,
      exercised,
      unvested: tranche.vestsOn > asOf ? remaining : 0,
      exercisable: tranche.vestsOn <= asOf && tranche.expiresOn >= asOf ? remaining : 0,
      expired: tranche.expiresOn < asOf ? remaining : 0,
    };
  });
}

export function periodSchedule(period: EsppPeriod, asOf: ISODate) {
  const purchases = period.activity.filter((record) => record.kind === "purchase");
  return period.purchaseDates.map((entry) => ({
    ...entry,
    purchase: purchases.find((record) => record.purchaseDateId === entry.id && record.date <= asOf),
  })).sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn));
}

export const equityEventLabels = { vest: "Vesting", expiry: "Exercise expiry", purchase: "ESPP purchase" } as const;
export type EquityEventKind = keyof typeof equityEventLabels;
export interface EquityEvent {
  plan: EquityPlan;
  kind: EquityEventKind;
  id: string;
  date: ISODate;
  options?: number;
}

export function equityPosition(plan: EquityPlan, inputs: EquityMarketInput[], asOf: ISODate) {
  const activity = plan.activity.filter((record) => record.date <= asOf);
  const held = rounded(activity.reduce((total, record) => total + sharesDelta(record), 0));
  const pending = plan.kind === "espp" ? rounded(activity.reduce((total, record) => total + contributionDelta(record, plan.currency), 0)) : 0;
  const events: EquityEvent[] = [];
  let exercisable = 0;

  if (plan.kind === "esop") {
    for (const tranche of grantBalances(plan, asOf)) {
      exercisable += tranche.exercisable;
      if (tranche.unvested) events.push({ plan, kind: "vest", id: tranche.id, date: tranche.vestsOn, options: tranche.unvested });
      if (tranche.unvested || tranche.exercisable) events.push({ plan, kind: "expiry", id: tranche.id, date: tranche.expiresOn, options: tranche.unvested + tranche.exercisable });
    }
  } else {
    for (const entry of periodSchedule(plan, asOf)) {
      if (!entry.purchase && entry.scheduledOn >= asOf) events.push({ plan, kind: "purchase", id: entry.id, date: entry.scheduledOn });
    }
  }

  const price = latestEquityInput(inputs, "price", equitySecurityKey(plan), asOf);
  const fx = latestEquityInput(inputs, "fx", plan.currency, asOf);
  const rate = plan.currency === "INR" ? 1 : fx?.value;
  const nativeValue = held === 0 ? 0 : price && held * price.value;
  const holdingsInr = nativeValue === 0 ? 0 : nativeValue !== undefined && rate !== undefined ? nativeValue * rate : undefined;
  const pendingInr = pending === 0 ? 0 : rate !== undefined ? pending * rate : undefined;

  return {
    plan, held, pending, exercisable, price, fx, nativeValue, holdingsInr, pendingInr,
    missingPrice: held > 0 && !price,
    missingHoldingsFx: held > 0 && nativeValue !== 0 && rate === undefined,
    missingPendingFx: pending > 0 && rate === undefined,
    events: events.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function equityTotal(values: (number | undefined)[]) {
  const missing = values.filter((value) => value === undefined).length;
  return {
    missing,
    value: missing > 0 && !values.some((value) => value !== undefined && value > 0)
      ? undefined
      : values.reduce<number>((total, value) => total + (value ?? 0), 0),
  };
}

function validDate(date: ISODate) {
  return /^[1-9]\d{3}-\d{2}-\d{2}$/.test(date) && fromUTC(toUTC(date)) === date;
}

export function validEquityNumber(value: number, max = EQUITY_MAX_AMOUNT, allowZero = false) {
  return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0) && value <= max && rounded(value) === value;
}

export function validateEquityInput(input: EquityMarketInput, asOf: ISODate) {
  if (!validDate(input.date) || input.date > asOf) return "Enter an input date on or before the dashboard date.";
  if (!validEquityNumber(input.value, EQUITY_MAX_AMOUNT, input.kind === "price")) {
    return input.kind === "price" ? "Enter a valid share price of zero or more." : "Enter a positive FX rate.";
  }
}

export function validateEquityPlan(plan: EquityPlan, asOf: ISODate) {
  if (!plan.employer || !plan.name) return "Enter an employer and a plan name.";
  if (!EQUITY_CURRENCIES.includes(plan.currency)) return "Select a valid currency.";

  if (plan.kind === "esop") {
    if (!validDate(plan.grantedOn) || plan.grantedOn > asOf) return "Enter a grant date on or before the dashboard date.";
    if (!validEquityNumber(plan.strikePrice, EQUITY_MAX_AMOUNT, true)) return "Enter a valid exercise price of zero or more.";
    if (!plan.tranches.length) return "Add at least one vesting tranche.";
    for (const tranche of plan.tranches) {
      if (!validDate(tranche.vestsOn) || tranche.vestsOn < plan.grantedOn ||
          !validDate(tranche.expiresOn) || tranche.expiresOn < tranche.vestsOn) {
        return "Each tranche must vest on or after the grant date and expire on or after vesting.";
      }
      if (!Number.isInteger(tranche.options) || tranche.options <= 0 || tranche.options > EQUITY_MAX_UNITS) {
        return "Enter a positive whole number of options for each tranche.";
      }
    }
  } else {
    if (!validDate(plan.startsOn) || !validDate(plan.endsOn) || plan.startsOn > plan.endsOn) {
      return "Enter a period end on or after the start date.";
    }
    if (!plan.purchaseDates.length) return "Add at least one scheduled purchase date.";
    const dates = plan.purchaseDates.map((entry) => entry.scheduledOn);
    if (dates.some((date) => !validDate(date) || date < plan.startsOn || date > plan.endsOn)) {
      return "Schedule each purchase within the offering period.";
    }
    if (new Set(dates).size !== dates.length) return "Use a different date for each scheduled purchase.";
  }

  let shares = 0;
  let pending = 0;
  const exercises = new Map<string, number>();
  const purchases = new Set<string>();
  for (const record of orderedEquityActivity(plan.activity)) {
    if (!validDate(record.date) || record.date > asOf) return "Record activity on or before the dashboard date.";
    if (record.kind === "exercise") {
      const tranche = plan.kind === "esop" ? plan.tranches.find((entry) => entry.id === record.trancheId) : undefined;
      if (!tranche || record.date < tranche.vestsOn || record.date > tranche.expiresOn) {
        return "An exercise must be on or after its vesting date and on or before its exercise deadline.";
      }
      if (!Number.isInteger(record.options) || record.options <= 0) return "Enter a positive whole number of options.";
      const total = (exercises.get(tranche.id) ?? 0) + record.options;
      if (total > tranche.options) return "Exercises exceed the options in the selected tranche.";
      exercises.set(tranche.id, total);
    } else if (record.kind !== "sale") {
      if (plan.kind !== "espp" || record.date < plan.startsOn || record.date > plan.endsOn) {
        return "Record contributions and purchases within the offering period.";
      }
      if (record.kind === "contribution" && !validEquityNumber(record.amount, EQUITY_MAX_AMOUNT)) return "Enter a positive contribution amount.";
      if (record.kind === "purchase") {
        if (!plan.purchaseDates.some((entry) => entry.id === record.purchaseDateId)) return "Select a scheduled purchase date.";
        if (purchases.has(record.purchaseDateId)) return "A purchase already exists for that scheduled date.";
        purchases.add(record.purchaseDateId);
      }
    }
    if (record.kind === "purchase" || record.kind === "sale") {
      if (!validEquityNumber(record.shares, EQUITY_MAX_UNITS)) return "Enter a positive share quantity.";
    }
    if ("price" in record && !validEquityNumber(record.price, EQUITY_MAX_AMOUNT, record.kind !== "purchase")) {
      return record.kind === "purchase" ? "Enter a positive purchase price." : "Enter a valid price of zero or more.";
    }
    if (record.kind === "purchase" && purchaseCost(record, plan.currency) === 0) {
      return `Enter a purchase cost of at least one minor unit in ${plan.currency}.`;
    }
    shares = rounded(shares + sharesDelta(record));
    if (shares < 0) return `Shares sold exceed shares held on ${formatDate(record.date)}.`;
    pending = rounded(pending + contributionDelta(record, plan.currency));
    if (pending < 0) return `Purchase cost exceeds contributions available on ${formatDate(record.date)}.`;
  }
}

/** Saving a plan replaces the plan with the same id, or adds it. */
export function upsertEquityPlan(plans: readonly EquityPlan[], plan: EquityPlan): EquityPlan[] {
  return plans.some((entry) => entry.id === plan.id)
    ? plans.map((entry) => entry.id === plan.id ? plan : entry)
    : [...plans, plan];
}

/** A market input is unique per kind, key and date; saving one replaces any match. */
export function upsertEquityInput(inputs: readonly EquityMarketInput[], input: EquityMarketInput): EquityMarketInput[] {
  return [...inputs.filter((entry) => entry.kind !== input.kind || entry.key !== input.key || entry.date !== input.date), input];
}
