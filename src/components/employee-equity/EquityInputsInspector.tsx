"use client";

import { useState, type FormEvent } from "react";
import { ChevronRight } from "lucide-react";
import { AS_OF } from "@/lib/data";
import { equitySecurityKey, equitySymbol, equityUnits, latestEquityInput, nativeMoney, validateEquityInput } from "@/lib/employee-equity";
import { formatDate } from "@/lib/format";
import type { EquityMarketInput } from "@/lib/types";
import { useEmployeeEquity, useUI } from "@/components/workspace/state";
import { Section } from "@/components/ui/primitives";
import { EquityDate, EquityField, EquityFormFooter, EquityNumber, fieldNumber, fieldText } from "./EquityFields";

export function EquityInputsInspector({ id }: { id: string }) {
  const { plans, inputs } = useEmployeeEquity();
  const plan = plans.find((entry) => entry.id === id);
  const securities = new Map(plans.map((entry) => [equitySecurityKey(entry), entry]));
  const currencies = [...new Set(plans.map((entry) => entry.currency).filter((currency) => currency !== "INR"))].sort();
  const [kind, setKind] = useState<EquityMarketInput["kind"]>("price");
  const [security, setSecurity] = useState(plan ? equitySecurityKey(plan) : securities.keys().next().value ?? "");
  const [currency, setCurrency] = useState(plan && plan.currency !== "INR" ? plan.currency : currencies[0] ?? "");
  const inputKey = kind === "price" ? security : currency;
  const code = kind === "price" ? securities.get(security)?.currency ?? "INR" : currency;
  const history = inputs.filter((entry) => entry.kind === kind && entry.key === inputKey).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="grid gap-3 px-4 py-4 md:px-5">
        <p className="text-sm text-ink-2">The dashboard uses the latest entered share price and FX rate dated on or before {formatDate(AS_OF)}.</p>
        <EquityField label="Input type">
          <select className="select w-full" value={kind} onChange={(event) => setKind(event.target.value as EquityMarketInput["kind"])}>
            <option value="price">Share price</option><option value="fx">FX rate to INR</option>
          </select>
        </EquityField>
        {kind === "price" ? (
          <EquityField label="Stock">
            <select className="select w-full" value={security} onChange={(event) => setSecurity(event.target.value)}>
              {[...securities].map(([key, entry]) => (
                <option key={key} value={key}>{entry.employer} · {entry.ticker && entry.exchange ? equitySymbol(entry) : entry.name} · {entry.currency}</option>
              ))}
            </select>
          </EquityField>
        ) : currencies.length > 0 && (
          <EquityField label="Currency">
            <select className="select w-full" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {currencies.map((code) => <option key={code}>{code}</option>)}
            </select>
          </EquityField>
        )}
      </div>
      {inputKey ? (
        <InputEditor key={`${kind}:${inputKey}`} kind={kind} inputKey={inputKey} currency={code} history={history} />
      ) : <p className="border-t border-rule px-4 py-4 text-sm text-ink-3">Add a {kind === "fx" ? "foreign-currency" : "stock"} plan to enter an input.</p>}
    </>
  );
}

function InputEditor({ kind, inputKey, currency, history }: {
  kind: EquityMarketInput["kind"]; inputKey: string; currency: string; history: EquityMarketInput[];
}) {
  const { saveInput } = useEmployeeEquity();
  const { toast } = useUI();
  const [entry, setEntry] = useState(() => latestEquityInput(history, kind, inputKey, AS_OF));
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = { kind, key: inputKey, date: fieldText(data, "date"), value: fieldNumber(data, "value") };
    const validation = validateEquityInput(input, AS_OF);
    setError(validation);
    if (validation) return;
    saveInput(input);
    toast({ message: kind === "price" ? "Share price saved" : "FX rate saved", tone: "success" });
  }

  return (
    <>
      <form key={revision} onSubmit={submit} className="border-y border-rule">
        <div className="grid grid-cols-2 gap-3 px-4 py-4 md:px-5">
          <EquityDate label="Input date" name="date" value={entry?.date ?? AS_OF} max={AS_OF} />
          <EquityNumber label={kind === "price" ? `Price (${currency})` : `INR per ${currency}`} name="value" value={entry?.value} allowZero={kind === "price"} />
        </div>
        <EquityFormFooter error={error} submit={kind === "price" ? "Save price" : "Save FX rate"} />
      </form>
      <Section id="equity-input-history" title="Dated inputs">
        {history.length ? (
          <ul>
            {history.map((input) => (
              <li key={input.date} className="border-t border-rule">
                <button type="button" className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-paper-2 md:px-5"
                  onClick={() => { setEntry(input); setRevision(revision + 1); setError(undefined); }}>
                  <span className="flex-1">{formatDate(input.date)}</span>
                  <span className="num">{kind === "price" ? nativeMoney(input.value, currency) : equityUnits(input.value)}</span>
                  <ChevronRight size={14} aria-hidden className="text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="border-t border-rule px-4 py-3 text-sm text-ink-3 md:px-5">No dated inputs yet.</p>}
      </Section>
    </>
  );
}
