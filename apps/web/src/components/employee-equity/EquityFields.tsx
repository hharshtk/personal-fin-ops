import type { ReactNode } from "react";
import { EQUITY_MAX_AMOUNT, EQUITY_PRECISION } from "@myfinancespace/core/employee-equity";

let equitySequence = 0;
export function newEquityId() {
  equitySequence += 1;
  return `manual-equity-${equitySequence}`;
}

export const fieldText = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
export const fieldNumber = (data: FormData, name: string) => {
  const value = fieldText(data, name);
  return value ? Number(value) : NaN;
};

export function EquityField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0"><span className="field-label">{label}</span>{children}</label>;
}

export function EquityNumber({ label, name, value, max = EQUITY_MAX_AMOUNT, whole, allowZero }: {
  label: string; name: string; value?: number; max?: number; whole?: boolean; allowZero?: boolean;
}) {
  const step = whole ? 1 : 10 ** -EQUITY_PRECISION;
  return (
    <EquityField label={label}>
      <input className="input w-full" name={name} type="number" inputMode={whole ? "numeric" : "decimal"}
        min={allowZero ? 0 : step} max={max} step={step} defaultValue={value} required />
    </EquityField>
  );
}

export function EquityDate({ label, name, value, max }: { label: string; name: string; value?: string; max?: string }) {
  return <EquityField label={label}><input className="input w-full min-w-0" name={name} type="date" min="1000-01-01" max={max ?? "9999-12-31"} defaultValue={value} required /></EquityField>;
}

export function EquityFormFooter({ error, cancel, submit = "Save changes" }: { error?: string; cancel?: () => void; submit?: string }) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-rule bg-paper px-4 py-3 md:px-5">
      {error && <p role="alert" className="mb-2 text-sm text-red">{error}</p>}
      <div className="flex justify-end gap-2">
        {cancel && <button type="button" className="btn" onClick={cancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary">{submit}</button>
      </div>
    </div>
  );
}
