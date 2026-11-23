"use client";

import { ChevronRight, Pencil, Plus } from "lucide-react";
import { AS_OF } from "@/lib/data";
import { equityActivityLabels, equityPosition, equitySymbol, equityUnits, grantBalances, nativeMoney, orderedEquityActivity, periodSchedule, purchaseCost } from "@/lib/employee-equity";
import { formatDate } from "@/lib/format";
import type { EquityActivity, EquityPlan } from "@/lib/types";
import { useEmployeeEquity, useUI } from "@/components/workspace/state";
import { Money } from "@/components/ui/money";
import { Facts, Section, Tag } from "@/components/ui/primitives";
import { TableWrap } from "@/components/ui/table";

function GrantSchedule({ plan }: { plan: Extract<EquityPlan, { kind: "esop" }> }) {
  const tranches = grantBalances(plan, AS_OF).sort((a, b) => a.vestsOn.localeCompare(b.vestsOn));
  return (
    <Section id="grant-schedule" title="Vesting schedule" className="border-t border-rule">
      <TableWrap label="Scrollable vesting schedule">
        <table className="tbl min-w-[320px]" aria-label="Vesting schedule">
          <thead>
            <tr><th>Vests</th><th>Exercise deadline</th><th className="r">Options</th><th className="r">Open</th></tr>
          </thead>
          <tbody>
            {tranches.map((t) => (
              <tr key={t.id}>
                <td className="num whitespace-nowrap">{formatDate(t.vestsOn)}</td>
                <td className="num whitespace-nowrap">{formatDate(t.expiresOn)}</td>
                <td className="r num">{equityUnits(t.options)}</td>
                <td className="r num">
                  {equityUnits(t.exercisable || t.unvested)}
                  <div className="text-xs text-ink-3">{t.expired ? `${equityUnits(t.expired)} expired` : t.unvested ? "Unvested" : t.exercisable ? "Exercisable" : "Exercised"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Section>
  );
}

function PurchaseSchedule({ plan }: { plan: Extract<EquityPlan, { kind: "espp" }> }) {
  return (
    <Section id="purchase-schedule" title="Purchase schedule" className="border-t border-rule">
      <ul>
        {periodSchedule(plan, AS_OF).map(({ id, scheduledOn, purchase }) => (
          <li key={id} className="flex items-center justify-between gap-3 border-t border-rule px-4 py-2 text-sm md:px-5">
            <span className="num">
              {formatDate(scheduledOn)}
              {purchase && purchase.date !== scheduledOn && <span className="block text-xs text-ink-3">Purchased {formatDate(purchase.date)}</span>}
            </span>
            {purchase
              ? <span className="text-right num">{equityUnits(purchase.shares)} shares
                  <span className="block text-xs text-ink-3">{nativeMoney(purchase.price, plan.currency)} / share</span></span>
              : <Tag>{scheduledOn < AS_OF ? "Awaiting record" : "Scheduled"}</Tag>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function activityDetail(record: EquityActivity, currency: string) {
  switch (record.kind) {
    case "exercise": return `${equityUnits(record.options)} options at ${nativeMoney(record.price, currency)}`;
    case "contribution": return nativeMoney(record.amount, currency);
    case "purchase": return `${equityUnits(record.shares)} shares at ${nativeMoney(record.price, currency)} · ${nativeMoney(purchaseCost(record, currency), currency)} used`;
    case "sale": return `${equityUnits(record.shares)} shares at ${nativeMoney(record.price, currency)}`;
  }
}

export function EquityPlanInspector({ id }: { id: string }) {
  const { plans, inputs } = useEmployeeEquity();
  const { inspect } = useUI();
  const plan = plans.find((entry) => entry.id === id);
  if (!plan) return <p className="p-4 text-sm text-ink-3">Plan unavailable.</p>;

  const position = equityPosition(plan, inputs, AS_OF);
  const tranches = plan.kind === "esop" ? grantBalances(plan, AS_OF) : [];
  const optionTotal = (balance: "unvested" | "exercisable" | "exercised" | "expired") =>
    equityUnits(tranches.reduce((sum, tranche) => sum + tranche[balance], 0));
  const activity = orderedEquityActivity(plan.activity).reverse();
  const canExercise = tranches.some((t) => t.vestsOn <= AS_OF && t.options > t.exercised);
  const canPurchase = plan.kind === "espp" && plan.startsOn <= AS_OF && periodSchedule(plan, AS_OF).some((entry) => !entry.purchase);
  const openActivity = (action: EquityActivity["kind"], recordId?: string) =>
    inspect({ kind: "equity-activity", id, action, recordId }, { push: true });

  return (
    <div className="pb-4">
      <div className="px-4 py-4 md:px-5">
        <Tag>{plan.kind.toUpperCase()}</Tag>
        <h2 className="mt-1 text-xl font-[650]">{plan.employer}</h2>
        <p className="text-sm text-ink-2">{plan.name}</p>
        <p className="mt-1 text-xs text-ink-3">{[equitySymbol(plan), plan.market === "indian" ? "Indian stock" : "Foreign stock", plan.currency].filter(Boolean).join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm" onClick={() => inspect({ kind: "edit-equity-plan", id }, { push: true })}>
            <Pencil size={13} aria-hidden /> {plan.kind === "esop" ? "Edit grant" : "Edit offering"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => inspect({ kind: "equity-inputs", id }, { push: true })}>Prices &amp; FX</button>
        </div>
      </div>

      <Section id="equity-balances" title={plan.kind === "esop" ? "Grant balances" : "Offering balances"} className="border-t border-rule" bodyClassName="px-4 pb-4 md:px-5">
        {plan.kind === "esop" ? (
          <Facts items={[
            ["Granted on", formatDate(plan.grantedOn)],
            ["Exercise price", nativeMoney(plan.strikePrice, plan.currency)],
            ["Unvested", optionTotal("unvested")],
            ["Vested and exercisable", optionTotal("exercisable")],
            ["Exercised", optionTotal("exercised")],
            ["Expired", optionTotal("expired")],
          ]} />
        ) : (
          <Facts items={[
            ["Starts", formatDate(plan.startsOn)],
            ["Ends", formatDate(plan.endsOn)],
            ["Uninvested", nativeMoney(position.pending, plan.currency)],
            ["Uninvested in INR", position.pendingInr === undefined ? "Unavailable · FX rate missing" : <Money value={position.pendingInr} />],
          ]} />
        )}
        <Facts className="mt-3 border-t border-rule pt-3" items={[
          ["Shares held", equityUnits(position.held)],
          ["Market value", position.nativeValue === undefined ? "Unavailable" : nativeMoney(position.nativeValue, plan.currency)],
          ["Share price", position.price ? <>{nativeMoney(position.price.value, plan.currency)}<span className="block text-xs text-ink-3">{formatDate(position.price.date)}</span></> : "No price entered"],
          ["Market value in INR", position.holdingsInr === undefined ? "Unavailable" : <Money value={position.holdingsInr} />],
          ...(plan.currency !== "INR" ? [[
            "INR per " + plan.currency,
            position.fx ? <>{equityUnits(position.fx.value)}<span className="block text-xs text-ink-3">{formatDate(position.fx.date)}</span></> : "No FX rate entered",
          ] as [string, React.ReactNode]] : []),
        ]} />
        {(position.missingPrice || position.missingHoldingsFx) && (
          <p className="mt-2 text-xs text-amber">INR market value unavailable. {position.missingPrice && position.missingHoldingsFx ? "Add a share price and FX rate." : position.missingPrice ? "Add a share price." : "Add an FX rate."}</p>
        )}
      </Section>

      {plan.kind === "esop" ? <GrantSchedule plan={plan} /> : <PurchaseSchedule plan={plan} />}

      <Section id="equity-history" title="Activity history" className="border-t border-rule">
        <div className="flex flex-wrap gap-2 px-4 pb-3 md:px-5">
          {canExercise && <button type="button" className="btn btn-sm" onClick={() => openActivity("exercise")}><Plus size={14} aria-hidden /> Record exercise</button>}
          {plan.kind === "espp" && plan.startsOn <= AS_OF && (
            <button type="button" className="btn btn-sm" onClick={() => openActivity("contribution")}><Plus size={14} aria-hidden /> Add contribution</button>
          )}
          {canPurchase && <button type="button" className="btn btn-sm" onClick={() => openActivity("purchase")}><Plus size={14} aria-hidden /> Record purchase</button>}
          {position.held > 0 && <button type="button" className="btn btn-sm" onClick={() => openActivity("sale")}><Plus size={14} aria-hidden /> Record sale</button>}
        </div>
        {activity.length ? (
          <ul>
            {activity.map((record) => (
              <li key={record.id} className="border-t border-rule">
                <button type="button" className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-paper-2 md:px-5"
                  aria-label={`Edit ${equityActivityLabels[record.kind].toLowerCase()} on ${formatDate(record.date)}`}
                  onClick={() => openActivity(record.kind, record.id)}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{equityActivityLabels[record.kind]} · {formatDate(record.date)}</span>
                    <span className="block text-xs text-ink-3 num">{activityDetail(record, plan.currency)}</span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="border-t border-rule px-4 py-3 text-sm text-ink-3 md:px-5">No activity recorded.</p>}
      </Section>
    </div>
  );
}
