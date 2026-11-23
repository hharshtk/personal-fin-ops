"use client";

import { useState, type FormEvent } from "react";
import { AS_OF } from "@/lib/data";
import { EQUITY_MAX_UNITS, equityActivityLabels, equityUnits, grantBalances, nativeMoney, periodSchedule, validateEquityPlan } from "@/lib/employee-equity";
import { formatDate } from "@/lib/format";
import type { EquityActivity, EquityPlan } from "@/lib/types";
import { useEmployeeEquity, useUI } from "@/components/workspace/state";
import { EquityDate, EquityField, EquityFormFooter, EquityNumber, fieldNumber, fieldText, newEquityId } from "./EquityFields";

type Action = EquityActivity["kind"];
const actionTitles: Record<Action, string> = {
  exercise: "Record exercise",
  sale: "Record sale",
  contribution: "Add contribution",
  purchase: "Record purchase",
};

function withActivity(plan: EquityPlan, record: EquityActivity): EquityPlan {
  if (plan.kind === "esop" && (record.kind === "exercise" || record.kind === "sale")) {
    return { ...plan, activity: [...plan.activity.filter((entry) => entry.id !== record.id), record] };
  }
  if (plan.kind === "espp" && record.kind !== "exercise") {
    return { ...plan, activity: [...plan.activity.filter((entry) => entry.id !== record.id), record] };
  }
  throw new Error("Activity does not match this plan");
}

export function EquityActivityForm({ id, action, recordId }: { id: string; action: Action; recordId?: string }) {
  const { plans } = useEmployeeEquity();
  const plan = plans.find((entry) => entry.id === id);
  const record = plan?.activity.find((entry) => entry.id === recordId && entry.kind === action);
  if (!plan || (recordId && !record)) return <p className="p-4 text-sm text-ink-3">Record unavailable.</p>;
  return <ActivityFields plan={plan} action={action} record={record} />;
}

function ActivityFields({ plan, action, record }: { plan: EquityPlan; action: Action; record?: EquityActivity }) {
  const { savePlan } = useEmployeeEquity();
  const { inspectorBack, toast } = useUI();
  const [error, setError] = useState<string>();
  const tranches = plan.kind === "esop" && action === "exercise" ? grantBalances(plan, AS_OF).filter((t) =>
    (t.vestsOn <= AS_OF && t.options > t.exercised) || (record?.kind === "exercise" && record.trancheId === t.id)) : [];
  const tranche = tranches.find((entry) => entry.exercisable > 0) ?? tranches.at(-1);
  const purchaseDates = plan.kind === "espp" && action === "purchase" ? periodSchedule(plan, AS_OF).filter((entry) =>
    !entry.purchase || (record?.kind === "purchase" && record.purchaseDateId === entry.id)) : [];
  let initialDate = AS_OF;
  if (tranche && tranche.expiresOn < initialDate) initialDate = tranche.expiresOn;
  if (plan.kind === "espp" && action !== "sale" && plan.endsOn < initialDate) initialDate = plan.endsOn;
  if (purchaseDates[0] && purchaseDates[0].scheduledOn < initialDate) initialDate = purchaseDates[0].scheduledOn;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const common = { id: record?.id ?? newEquityId(), date: fieldText(data, "date") };
    const price = fieldNumber(data, "price");
    const shares = fieldNumber(data, "shares");
    let activity: EquityActivity;
    switch (action) {
      case "exercise":
        activity = { ...common, kind: action, options: fieldNumber(data, "options"), trancheId: fieldText(data, "tranche"), price };
        break;
      case "sale":
        activity = { ...common, kind: action, shares, price };
        break;
      case "purchase":
        activity = { ...common, kind: action, shares, price, purchaseDateId: fieldText(data, "purchase-date") };
        break;
      case "contribution":
        activity = { ...common, kind: action, amount: fieldNumber(data, "amount") };
        break;
    }
    const updated = withActivity(plan, activity);
    const validation = validateEquityPlan(updated, AS_OF);
    setError(validation);
    if (validation) return;
    savePlan(updated);
    inspectorBack();
    toast({ message: `${equityActivityLabels[action]} ${record ? "updated" : "recorded"}`, tone: "success" });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-3 px-4 py-4 md:px-5">
        <div>
          <h2 className="section-title">{record ? `Edit ${equityActivityLabels[action].toLowerCase()}` : actionTitles[action]}</h2>
          <p className="text-xs text-ink-3">{plan.employer} · {plan.name}</p>
        </div>
        {action === "exercise" && plan.kind === "esop" && (
          <>
            <EquityField label="Vesting tranche">
              <select name="tranche" className="select w-full" required defaultValue={record?.kind === "exercise" ? record.trancheId : tranche?.id}>
                {tranches.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatDate(t.vestsOn)} · {equityUnits(t.options - t.exercised + (record?.kind === "exercise" && record.trancheId === t.id ? record.options : 0))} left
                  </option>
                ))}
              </select>
            </EquityField>
            <p className="text-xs text-ink-3">Grant exercise price {nativeMoney(plan.strikePrice, plan.currency)} per option.</p>
          </>
        )}
        {action === "purchase" && (
          <EquityField label="Scheduled purchase">
            <select name="purchase-date" className="select w-full" required defaultValue={record?.kind === "purchase" ? record.purchaseDateId : purchaseDates[0]?.id}>
              {purchaseDates.map((entry) => <option key={entry.id} value={entry.id}>{formatDate(entry.scheduledOn)}</option>)}
            </select>
          </EquityField>
        )}
        <EquityDate label={action === "purchase" ? "Actual purchase date" : "Date"} name="date" value={record?.date ?? initialDate} max={AS_OF} />
        {action === "exercise" && <EquityNumber label="Options exercised" name="options" value={record?.kind === "exercise" ? record.options : undefined} max={EQUITY_MAX_UNITS} whole />}
        {(action === "purchase" || action === "sale") && (
          <EquityNumber label={action === "purchase" ? "Shares received" : "Shares sold"} name="shares"
            value={record?.kind === "purchase" || record?.kind === "sale" ? record.shares : undefined} max={EQUITY_MAX_UNITS} />
        )}
        {action === "contribution"
          ? <EquityNumber label={`Contribution amount (${plan.currency})`} name="amount" value={record?.kind === "contribution" ? record.amount : undefined} />
          : <EquityNumber label={`${action === "exercise" ? "Exercise price per option" : "Price per share"} (${plan.currency})`} name="price" allowZero={action !== "purchase"}
              value={record && "price" in record ? record.price : action === "exercise" && plan.kind === "esop" ? plan.strikePrice : undefined} />}
        {action === "purchase" && <p className="text-xs text-ink-3">Purchase cost is deducted from the contributions available on the actual purchase date.</p>}
      </div>
      <EquityFormFooter error={error} cancel={inspectorBack} submit={record ? "Save changes" : actionTitles[action]} />
    </form>
  );
}
