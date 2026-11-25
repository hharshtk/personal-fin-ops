"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { AS_OF } from "@myfinancespace/core/data";
import { EQUITY_CURRENCIES, EQUITY_MAX_UNITS, validateEquityPlan } from "@myfinancespace/core/employee-equity";
import type { EquityMarket, EquityPlan, EquityPlanKind } from "@myfinancespace/core/types";
import { useEmployeeEquity, useUI } from "@/components/workspace/state";
import { EquityDate, EquityField, EquityFormFooter, EquityNumber, fieldNumber, fieldText, newEquityId } from "./EquityFields";

export function EquityPlanForm({ id, initialKind = "esop" }: { id?: string; initialKind?: EquityPlanKind }) {
  const { plans } = useEmployeeEquity();
  const plan = plans.find((entry) => entry.id === id);
  if (id && !plan) return <p className="p-4 text-sm text-ink-3">Plan unavailable.</p>;
  return <PlanFields plan={plan} initialKind={initialKind} />;
}

function PlanFields({ plan, initialKind }: { plan?: EquityPlan; initialKind: EquityPlanKind }) {
  const { savePlan } = useEmployeeEquity();
  const { inspect, inspectorBack, closeInspector, toast } = useUI();
  const [kind, setKind] = useState(plan?.kind ?? initialKind);
  const [currency, setCurrency] = useState(plan?.currency ?? "INR");
  const [trancheIds, setTrancheIds] = useState(plan?.kind === "esop" ? plan.tranches.map((t) => t.id) : ["tranche"]);
  const [purchaseIds, setPurchaseIds] = useState(plan?.kind === "espp" ? plan.purchaseDates.map((entry) => entry.id) : ["purchase"]);
  const [error, setError] = useState<string>();
  const cancel = plan ? inspectorBack : closeInspector;
  const currencyLocked = Boolean(plan?.activity.length);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const common = {
      id: plan?.id ?? newEquityId(),
      employer: fieldText(data, "employer"),
      name: fieldText(data, "name"),
      ticker: fieldText(data, "ticker").toUpperCase() || undefined,
      exchange: fieldText(data, "exchange").toUpperCase() || undefined,
      market: fieldText(data, "market") as EquityMarket,
      currency,
    };
    const updated: EquityPlan = kind === "esop" ? {
      ...common,
      kind,
      grantedOn: fieldText(data, "grant-date"),
      strikePrice: fieldNumber(data, "strike"),
      tranches: trancheIds.map((id) => ({
        id,
        vestsOn: fieldText(data, `vest-${id}`),
        expiresOn: fieldText(data, `expiry-${id}`),
        options: fieldNumber(data, `options-${id}`),
      })),
      activity: plan?.kind === "esop" ? plan.activity : [],
    } : {
      ...common,
      kind,
      startsOn: fieldText(data, "start"),
      endsOn: fieldText(data, "end"),
      purchaseDates: purchaseIds.map((id) => ({ id, scheduledOn: fieldText(data, `purchase-${id}`) })),
      activity: plan?.kind === "espp" ? plan.activity : [],
    };
    const validation = validateEquityPlan(updated, AS_OF);
    setError(validation);
    if (validation) return;
    savePlan(updated);
    if (plan) inspectorBack();
    else inspect({ kind: "equity-plan", id: updated.id });
    toast({ message: plan ? "Plan updated" : "Plan added", tone: "success" });
  }

  return (
    <form onSubmit={submit} className="text-sm">
      <div className="grid gap-3 px-4 py-4 md:px-5">
        {!plan && (
          <EquityField label="Plan type">
            <select className="select w-full" value={kind} onChange={(event) => { setKind(event.target.value as EquityPlanKind); setError(undefined); }}>
              <option value="esop">ESOP grant</option><option value="espp">ESPP offering</option>
            </select>
          </EquityField>
        )}
        <EquityField label="Employer"><input name="employer" className="input w-full" maxLength={80} defaultValue={plan?.employer} required /></EquityField>
        <EquityField label={kind === "esop" ? "Grant name" : "Offering name"}><input name="name" className="input w-full" maxLength={80} defaultValue={plan?.name} required /></EquityField>
        <div className="grid grid-cols-2 gap-3">
          <EquityField label="Ticker (optional)"><input name="ticker" className="input w-full" maxLength={24} defaultValue={plan?.ticker} /></EquityField>
          <EquityField label="Exchange (optional)"><input name="exchange" className="input w-full" maxLength={32} defaultValue={plan?.exchange} /></EquityField>
          <EquityField label="Market">
            <select name="market" className="select w-full" defaultValue={plan?.market ?? "indian"}>
              <option value="indian">Indian stock</option><option value="foreign">Foreign stock</option>
            </select>
          </EquityField>
          <EquityField label="Currency">
            <select className="select w-full" value={currency} disabled={currencyLocked} onChange={(event) => setCurrency(event.target.value)}>
              {EQUITY_CURRENCIES.map((code) => <option key={code}>{code}</option>)}
            </select>
          </EquityField>
        </div>
        {currencyLocked && <p className="text-xs text-ink-3">Recorded activity uses {currency}.</p>}
        {kind === "esop" ? (
          <div className="grid grid-cols-2 gap-3">
            <EquityDate label="Grant date" name="grant-date" value={plan?.kind === "esop" ? plan.grantedOn : AS_OF} max={AS_OF} />
            <EquityNumber label={`Exercise price (${currency})`} name="strike" value={plan?.kind === "esop" ? plan.strikePrice : undefined} allowZero />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <EquityDate label="Period start" name="start" value={plan?.kind === "espp" ? plan.startsOn : AS_OF} />
            <EquityDate label="Period end" name="end" value={plan?.kind === "espp" ? plan.endsOn : undefined} />
          </div>
        )}
      </div>
      <div className="border-t border-rule px-4 py-4 md:px-5">
        {kind === "esop" ? (
          <>
            <h2 className="section-title">Vesting tranches</h2>
            {trancheIds.map((id, index) => {
              const tranche = plan?.kind === "esop" ? plan.tranches.find((entry) => entry.id === id) : undefined;
              const used = plan?.kind === "esop" && plan.activity.some((entry) => entry.kind === "exercise" && entry.trancheId === id);
              return (
                <fieldset key={id} className="mt-3 grid grid-cols-2 gap-3 border-b border-rule pb-3">
                  <legend className="mb-1 text-xs font-semibold text-ink-3">Tranche {index + 1}</legend>
                  <EquityDate label="Vesting date" name={`vest-${id}`} value={tranche?.vestsOn} />
                  <EquityDate label="Exercise deadline" name={`expiry-${id}`} value={tranche?.expiresOn} />
                  <EquityNumber label="Options" name={`options-${id}`} value={tranche?.options} max={EQUITY_MAX_UNITS} whole />
                  {!used && trancheIds.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm self-end justify-self-end" aria-label={`Remove tranche ${index + 1}`}
                      onClick={() => setTrancheIds(trancheIds.filter((other) => other !== id))}><X size={14} aria-hidden /> Remove</button>
                  )}
                </fieldset>
              );
            })}
            <button type="button" className="btn btn-sm mt-3" onClick={() => setTrancheIds([...trancheIds, newEquityId()])}><Plus size={14} aria-hidden /> Add tranche</button>
          </>
        ) : (
          <>
            <h2 className="section-title">Purchase schedule</h2>
            {purchaseIds.map((id, index) => {
              const entry = plan?.kind === "espp" ? plan.purchaseDates.find((date) => date.id === id) : undefined;
              const used = plan?.kind === "espp" && plan.activity.some((record) => record.kind === "purchase" && record.purchaseDateId === id);
              return (
                <div key={id} className="mt-3 grid grid-cols-2 gap-3">
                  <EquityDate label={`Purchase date ${index + 1}`} name={`purchase-${id}`} value={entry?.scheduledOn} />
                  {!used && purchaseIds.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm self-end justify-self-end" aria-label={`Remove purchase date ${index + 1}`}
                      onClick={() => setPurchaseIds(purchaseIds.filter((other) => other !== id))}><X size={14} aria-hidden /> Remove</button>
                  )}
                </div>
              );
            })}
            <button type="button" className="btn btn-sm mt-3" onClick={() => setPurchaseIds([...purchaseIds, newEquityId()])}><Plus size={14} aria-hidden /> Add purchase date</button>
          </>
        )}
      </div>
      <EquityFormFooter error={error} cancel={cancel} submit={plan ? "Save changes" : "Add plan"} />
    </form>
  );
}
