"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import type { AiCredits } from "@/lib/ai-credits";
import { AS_OF, PROFILE } from "@/lib/data";
import { formatDate, formatMoney, formatUsd, fyLabel } from "@/lib/format";
import { TRANSCRIPTION_MODELS } from "@/lib/transcription";
import { useEmployeeEquity, useLedger, usePrefs, useUI, type Prefs } from "@/components/workspace/state";
import { useDensity, useRail, useTheme, type ThemePref } from "@/components/shell/theme";
import { PageHeader } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";

function Row({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-rule py-3.5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <div id={id} className="text-sm font-medium text-ink">
          {label}
        </div>
        {hint && <div className="mt-0.5 max-w-[60ch] text-xs text-ink-3">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, labelledBy, disabled }: { checked: boolean; onChange: (v: boolean) => void; labelledBy: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40", checked ? "bg-pen" : "bg-rule-2")}
    >
      <span className={cx("absolute top-0.5 left-0 size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TranscriptionModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const cheapest = Math.min(...TRANSCRIPTION_MODELS.map((model) => Number(model.usdPerMinute)));
  return (
    <fieldset className="py-3.5">
      <legend className="text-sm font-medium text-ink">Transcription model</legend>
      <p className="mt-0.5 max-w-[60ch] text-xs text-ink-3">
        Turns what you say in Ask AI into text. Groq models bill your Groq account, which has a free plan with a daily allowance. OpenAI and Google models run through Vercel AI Gateway and bill your gateway credits. Prices are approximate, per minute of audio.
      </p>
      <div className="mt-3 divide-y divide-rule border-y border-rule">
        {TRANSCRIPTION_MODELS.map((model) => (
          <label key={model.id} className="flex min-h-11 cursor-pointer items-center gap-3 px-2 py-2 hover:bg-paper-2 has-checked:bg-pen-wash">
            <input type="radio" name="transcription-model" value={model.id} checked={value === model.id} onChange={() => onChange(model.id)} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{model.name}</span>
              <span className="block text-xs text-ink-3">
                {[
                  model.provider,
                  model.freePlan && "free plan",
                  Number(model.usdPerMinute) === cheapest && "lowest cost",
                  model.retiresOn && `retires ${formatDate(model.retiresOn)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="num shrink-0 text-sm text-ink-2">{formatUsd(model.usdPerMinute)}/min</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AiCreditsBalance() {
  const [credits, setCredits] = useState<AiCredits | "loading" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    fetch("/api/v1/ai-credits", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<AiCredits>) : Promise.reject(new Error(String(response.status)))))
      .then((data) => current && setCredits(typeof data?.balance?.amount === "string" ? data : "error"))
      .catch(() => current && setCredits("error"));
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-ink-2" aria-live="polite">
        {credits === "loading" && "Checking…"}
        {credits === "error" && "Couldn’t load the balance"}
        {typeof credits === "object" && (
          <>
            <span className="num font-medium text-ink">{formatUsd(credits.balance.amount)}</span> left ·{" "}
            <span className="num">{formatUsd(credits.used.amount)}</span> used
          </>
        )}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-icon size-11 text-ink-2 md:size-8"
        aria-label="Refresh credit balance"
        title="Refresh credit balance"
        disabled={credits === "loading"}
        onClick={() => {
          setCredits("loading");
          setAttempt((n) => n + 1);
        }}
      >
        <RotateCw size={14} aria-hidden />
      </button>
    </div>
  );
}

const SECTIONS = [
  { id: "appearance", label: "Appearance" },
  { id: "numbers", label: "Numbers & currency" },
  { id: "calendar", label: "Financial year & calendar" },
  { id: "alerts", label: "Reminders & alerts" },
  { id: "defaults", label: "Default views" },
  { id: "voice", label: "Voice input" },
  { id: "data", label: "Data" },
];

export function SettingsView() {
  const { prefs, setPref, resetPrefs } = usePrefs();
  const { sessionChanges: ledgerChanges, resetSession } = useLedger();
  const { changes: equityChanges, resetEquity } = useEmployeeEquity();
  const sessionChanges = ledgerChanges + equityChanges;
  const { toast } = useUI();
  const theme = useTheme();
  const density = useDensity();
  const rail = useRail();
  const sample = 18432610;
  const set = <K extends keyof Prefs>(k: K) => (v: Prefs[K]) => setPref(k, v);

  return (
    <div>
      <PageHeader title="Settings" meta={`${PROFILE.name} · preferences apply to this browser`} />
      <div className="mt-4 grid gap-8 border-t border-rule px-4 pt-2 pb-10 md:px-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-16 space-y-0.5 pt-4">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-[3px] px-2 py-1.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="max-w-3xl space-y-8 pt-4">
          <section id="appearance" aria-labelledby="h-appearance" className="scroll-mt-16">
            <h2 id="h-appearance" className="section-title mb-1">
              Appearance
            </h2>
            <Row label="Theme" hint="Light suits daytime desk use; dark follows the same palette for evening reviews.">
              <Seg<ThemePref>
                label="Theme"
                value={theme.pref}
                onChange={theme.setTheme}
                options={[
                  { id: "light", label: "Light" },
                  { id: "dark", label: "Dark" },
                  { id: "system", label: "Match system" },
                ]}
              />
            </Row>
            <Row label="Table density" hint="Compact fits about 25% more rows on screen.">
              <Seg
                label="Table density"
                value={density.density}
                onChange={density.setDensity}
                options={[
                  { id: "comfortable", label: "Comfortable" },
                  { id: "compact", label: "Compact" },
                ]}
              />
            </Row>
            <Row label="Navigation" hint={<>Collapse to icons for more working space. Shortcut <span className="kbd">[</span></>}>
              <Seg
                label="Navigation"
                value={rail.collapsed ? "collapsed" : "open"}
                onChange={(v) => rail.setRail(v)}
                options={[
                  { id: "open", label: "Expanded" },
                  { id: "collapsed", label: "Icons only" },
                ]}
              />
            </Row>
          </section>

          <section id="numbers" aria-labelledby="h-numbers" className="scroll-mt-16">
            <h2 id="h-numbers" className="section-title mb-1">
              Numbers & currency
            </h2>
            <Row label="Number grouping" hint={`Shown as ${formatMoney(sample, { system: prefs.numberSystem })} · ${formatMoney(sample, { system: prefs.numberSystem, compact: true })}`}>
              <Seg
                label="Number grouping"
                value={prefs.numberSystem}
                onChange={set("numberSystem")}
                options={[
                  { id: "indian", label: "Lakh & crore" },
                  { id: "international", label: "Million & billion" },
                ]}
              />
            </Row>
            <Row id="lbl-compact" label="Short figures in summaries" hint="₹1.84 Cr instead of ₹1,84,32,610 in headline numbers. Tables always show full amounts.">
              <Switch checked={prefs.compactFigures} onChange={set("compactFigures")} labelledBy="lbl-compact" />
            </Row>
            <Row id="lbl-paise" label="Show paise in tables" hint="Adds two decimals to ledger amounts.">
              <Switch checked={prefs.showPaise} onChange={set("showPaise")} labelledBy="lbl-paise" />
            </Row>
            <Row label="Base currency" hint="Other currencies will be available when foreign accounts can be added.">
              <select className="select w-[220px]" value="INR" aria-label="Base currency" onChange={() => undefined}>
                <option value="INR">Indian rupee (₹ INR)</option>
                <option value="USD" disabled>
                  US dollar (USD) · later
                </option>
                <option value="AED" disabled>
                  UAE dirham (AED) · later
                </option>
              </select>
            </Row>
          </section>

          <section id="calendar" aria-labelledby="h-calendar" className="scroll-mt-16">
            <h2 id="h-calendar" className="section-title mb-1">
              Financial year & calendar
            </h2>
            <Row label="Financial year starts" hint={`Today falls in ${fyLabel(AS_OF, prefs.fyStartMonth)}.`}>
              <select className="select w-[220px]" value={prefs.fyStartMonth} onChange={(e) => setPref("fyStartMonth", Number(e.target.value) as 1 | 4)} aria-label="Financial year starts">
                <option value={4}>April (Indian FY)</option>
                <option value={1}>January (calendar year)</option>
              </select>
            </Row>
            <Row label="Week starts on" hint="Applies to the money calendar on Overview and Bills.">
              <Seg
                label="Week starts on"
                value={String(prefs.weekStart) as "0" | "1"}
                onChange={(v) => setPref("weekStart", Number(v) as 0 | 1)}
                options={[
                  { id: "1", label: "Monday" },
                  { id: "0", label: "Sunday" },
                ]}
              />
            </Row>
          </section>

          <section id="alerts" aria-labelledby="h-alerts" className="scroll-mt-16">
            <h2 id="h-alerts" className="section-title mb-1">
              Reminders & alerts
            </h2>
            <Row label="Remind me about manual bills" hint="How early a bill without autopay appears in Needs attention.">
              <select className="select w-[220px]" value={prefs.billReminderDays} onChange={(e) => setPref("billReminderDays", Number(e.target.value))} aria-label="Bill reminder">
                {[3, 5, 7, 10].map((d) => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? "day" : "days"} before
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Flag a budget category at" hint="Meters turn amber at this share of the budget, and red past 100%.">
              <select className="select w-[220px]" value={prefs.budgetAlertAt} onChange={(e) => setPref("budgetAlertAt", Number(e.target.value))} aria-label="Budget alert threshold">
                {[75, 80, 90, 100].map((d) => (
                  <option key={d} value={d}>
                    {d}% of budget
                  </option>
                ))}
              </select>
            </Row>
            <Row id="lbl-digest" label="Weekly email summary" hint="Needs an account and email delivery, which arrive in a later phase.">
              <Switch checked={false} onChange={() => undefined} labelledBy="lbl-digest" disabled />
            </Row>
          </section>

          <section id="defaults" aria-labelledby="h-defaults" className="scroll-mt-16">
            <h2 id="h-defaults" className="section-title mb-1">
              Default views
            </h2>
            <Row label="Transactions open on" hint="The period the ledger shows when you arrive without a filter.">
              <select className="select w-[220px]" value={prefs.defaultTxnPeriod} onChange={(e) => setPref("defaultTxnPeriod", e.target.value as Prefs["defaultTxnPeriod"])} aria-label="Transactions default period">
                <option value="month">This month</option>
                <option value="90d">Last 90 days</option>
                <option value="fy">Financial year to date</option>
                <option value="all">Everything</option>
              </select>
            </Row>
          </section>

          <section id="voice" aria-labelledby="h-voice" className="scroll-mt-16">
            <h2 id="h-voice" className="section-title mb-1">
              Voice input
            </h2>
            <TranscriptionModelPicker value={prefs.transcriptionModel} onChange={set("transcriptionModel")} />
            <Row label="AI Gateway credits" hint="Used by the OpenAI and Google models above and shared by every AI feature on this app’s gateway key. Each recording’s cost also appears in Ask AI once it’s transcribed.">
              <AiCreditsBalance />
            </Row>
          </section>

          <section id="data" aria-labelledby="h-data" className="scroll-mt-16">
            <h2 id="h-data" className="section-title mb-1">
              Data
            </h2>
            <Row label="Demonstration data" hint={`Every figure is synthetic, fixed as of ${formatDate(AS_OF)}. Bank, fund and insurer names are labels only; nothing is connected.`}>
              <span className="text-sm text-ink-3">Read only</span>
            </Row>
            <Row label="Changes made in this session" hint="Changes to transactions, bills and employee equity disappear when you reload.">
              <button
                type="button"
                className="btn"
                disabled={!sessionChanges}
                onClick={() => {
                  resetSession();
                  resetEquity();
                  toast({ message: "Session changes cleared" });
                }}
              >
                <RotateCcw size={14} aria-hidden /> Undo {sessionChanges || "no"} {sessionChanges === 1 ? "change" : "changes"}
              </button>
            </Row>
            <Row label="Preferences" hint="Number, calendar, alert and voice settings above.">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  resetPrefs();
                  toast({ message: "Preferences restored to defaults" });
                }}
              >
                Restore defaults
              </button>
            </Row>
          </section>
        </div>
      </div>
    </div>
  );
}
