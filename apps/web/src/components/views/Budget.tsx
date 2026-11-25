"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Table2, BarChart3 } from "lucide-react";
import type { MonthKey } from "@myfinancespace/core/types";
import { AS_OF, AS_OF_MONTH, BUDGET_MONTHS, COMMITMENTS, DATA_START_DATE, budgetFor, flowForMonth, monthFlows, ledgerAccountShort } from "@myfinancespace/core/data";
import { daysInMonth, formatMonth, monthOf, monthSpanLabel, parts } from "@myfinancespace/core/format";
import { useLedger, usePrefs, useUI } from "@/components/workspace/state";
import { Money, Pct } from "@/components/ui/money";
import { BudgetMeter, Metric, MetricStrip, PageHeader, Progress, Section } from "@/components/ui/primitives";
import { Columns } from "@/components/charts/Columns";
import { TableWrap } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";

const SAVINGS_TARGET = 0.25;
const TAKE_HOME = 246800;

export function BudgetView() {
  const router = useRouter();
  const { txns } = useLedger();
  const { prefs } = usePrefs();
  const { toast } = useUI();
  const [month, setMonth] = useState<MonthKey>(AS_OF_MONTH);
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [chartAsTable, setChartAsTable] = useState(false);

  const lines = budgetFor(month, txns).map((l) => {
    const budget = overrides[l.category.id] ?? l.budget;
    return { ...l, budget, ratio: l.actual / budget, remaining: budget - l.actual };
  });
  const totalBudget = lines.reduce((s, l) => s + l.budget, 0);
  const spent = lines.reduce((s, l) => s + l.actual, 0);
  const flow = flowForMonth(month, txns);
  const isCurrent = month === AS_OF_MONTH;
  const { y, m } = parts(`${month}-01`);
  const dim = daysInMonth(y, m);
  const daysLeft = isCurrent ? dim - parts(AS_OF).d : 0;
  const invested = flow.invested;
  const savingsRate = flow.income ? invested / flow.income : 0;
  const mi = BUDGET_MONTHS.indexOf(month);
  const [from, to] = [`${month}-01`, isCurrent ? AS_OF : `${month}-${String(dim).padStart(2, "0")}`];
  const alertAt = prefs.budgetAlertAt / 100;

  const monthly = COMMITMENTS.filter((c) => c.cadence === "Monthly" && c.kind !== "card");
  const groups = [
    { label: "Loan EMIs", items: monthly.filter((c) => c.kind === "emi") },
    { label: "Investments & savings", items: monthly.filter((c) => c.kind === "sip" || c.kind === "deposit" || c.kind === "transfer") },
  ];
  const bills = monthly.filter((c) => c.kind === "utility" || c.kind === "household" || c.kind === "subscription");
  const billTotal = bills.reduce((s, c) => s + c.amount, 0);
  const committed = groups.flatMap((g) => g.items).reduce((s, c) => s + c.amount, 0);
  const planGap = TAKE_HOME - committed - totalBudget;
  const recent = monthFlows(txns).filter((f) => f.month >= monthOf(DATA_START_DATE) && f.month < AS_OF_MONTH);
  const avgSpend = recent.reduce((s, f) => s + f.spending, 0) / recent.length;

  const startEdit = () => {
    setDraft(Object.fromEntries(lines.map((l) => [l.category.id, String(l.budget)])));
    setEditing(true);
  };
  const saveEdit = () => {
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(draft)) {
      const n = Math.round(Number(v.replace(/,/g, "")));
      if (Number.isFinite(n) && n >= 0) next[k] = n;
    }
    setOverrides(next);
    setEditing(false);
    toast({ message: "Budgets updated for this session", tone: "success" });
  };
  const invalid = (v: string) => !/^\d[\d,]*$/.test(v.trim());

  const groupsSpend = [
    { label: "Essentials", rows: lines.filter((l) => l.category.group === "essentials") },
    { label: "Lifestyle", rows: lines.filter((l) => l.category.group === "lifestyle") },
  ];

  return (
    <div>
      <PageHeader
        title="Budget & cash flow"
        meta="Spending against plan, money committed before you spend, and what's left"
        actions={
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-ghost btn-icon" disabled={mi <= 0} onClick={() => setMonth(BUDGET_MONTHS[mi - 1])} aria-label="Previous month">
              <ChevronLeft size={16} aria-hidden />
            </button>
            <select className="select w-[150px]" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              {BUDGET_MONTHS.map((mo) => (
                <option key={mo} value={mo}>
                  {formatMonth(mo, "MMMM yyyy")}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-ghost btn-icon" disabled={mi >= BUDGET_MONTHS.length - 1} onClick={() => setMonth(BUDGET_MONTHS[mi + 1])} aria-label="Next month">
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        }
      />

      <MetricStrip className="mt-4">
        <Metric label="Spent" value={<Money value={spent} />} sub={<>of <Money value={totalBudget} /> budgeted · <Pct value={(spent / totalBudget) * 100} decimals={0} /></>} />
        <Metric
          label={isCurrent ? "Left to spend" : "Under / over plan"}
          value={<Money value={totalBudget - spent} sign={isCurrent ? "auto" : "always"} tone={totalBudget - spent < 0 ? "gain" : "none"} />}
          sub={isCurrent ? `${daysLeft} days left in ${formatMonth(month, "MMMM yyyy").split(" ")[0]}` : "Month closed"}
        />
        <Metric label={isCurrent ? "Per day from here" : "Daily average"} value={<Money value={isCurrent ? Math.max(0, (totalBudget - spent) / Math.max(1, daysLeft)) : spent / dim} />} sub={isCurrent ? "to stay within budget" : "across the month"} />
        <Metric
          label="Invested from income"
          value={<Pct value={savingsRate * 100} decimals={0} />}
          sub={
            <span className={cx(savingsRate >= SAVINGS_TARGET ? "text-green" : "text-amber")}>
              Target {SAVINGS_TARGET * 100}% · <Money value={invested} compact /> invested
            </span>
          }
        />
      </MetricStrip>

      <div className="grid gap-px border-b border-rule bg-rule @container lg:grid-cols-12 [&>*]:bg-paper">
        <Section
          className="lg:col-span-8"
          title="Planned vs actual"
          meta={`${formatMonth(month, "MMMM yyyy")}${isCurrent ? " to date" : ""}`}
          actions={
            editing ? (
              <>
                <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit} disabled={Object.values(draft).some(invalid)}>
                  Save budgets
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-sm" onClick={startEdit}>
                <Pencil size={13} aria-hidden /> Edit budgets
              </button>
            )
          }
        >
          <TableWrap>
            <table className="tbl min-w-[620px]">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="r w-[120px]">Budget</th>
                  <th className="r w-[110px]">Spent</th>
                  <th className="w-[26%]">
                    <span className="sr-only">Progress</span>
                  </th>
                  <th className="r w-[110px]">Left</th>
                </tr>
              </thead>
              {groupsSpend.map((g) => (
                <tbody key={g.label}>
                  <tr>
                    <td colSpan={5} className="h-8 bg-paper-2 text-xs font-semibold text-ink-3">
                      {g.label} · <Money value={g.rows.reduce((s, l) => s + l.actual, 0)} /> of <Money value={g.rows.reduce((s, l) => s + l.budget, 0)} />
                    </td>
                  </tr>
                  {g.rows.map((l) => (
                    <tr
                      key={l.category.id}
                      data-clickable={!editing}
                      onClick={() => !editing && router.push(`/transactions?category=${l.category.id}&period=custom&from=${from}&to=${to}`)}
                      title={editing ? undefined : `See ${l.count} ${l.category.name.toLowerCase()} transactions`}
                    >
                      <td>
                        <span className="font-medium text-ink">{l.category.name}</span>
                        <span className="ml-2 text-xs text-ink-3">{l.count} txns</span>
                      </td>
                      <td className="r">
                        {editing ? (
                          <input
                            className="input num h-7 w-[100px] text-right"
                            value={draft[l.category.id] ?? ""}
                            onChange={(e) => setDraft((d) => ({ ...d, [l.category.id]: e.target.value }))}
                            aria-label={`${l.category.name} budget`}
                            aria-invalid={invalid(draft[l.category.id] ?? "")}
                            inputMode="numeric"
                          />
                        ) : (
                          <Money value={l.budget} className="num text-ink-2" />
                        )}
                      </td>
                      <td className="r">
                        <Money value={l.actual} className={cx("num font-semibold", l.ratio > 1 && "text-red")} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <BudgetMeter ratio={l.ratio} alertAt={alertAt} className="flex-1" />
                          <span className={cx("num w-10 text-right text-xs", l.ratio > 1 ? "font-semibold text-red" : l.ratio >= alertAt ? "text-amber" : "text-ink-3")}>{Math.round(l.ratio * 100)}%</span>
                        </div>
                      </td>
                      <td className="r">
                        <Money value={l.remaining} className={cx("num", l.remaining < 0 ? "text-red" : "text-ink-2")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </TableWrap>
          <p className="px-4 py-3 text-xs text-ink-3 md:px-5">Refunds reduce the category they belong to. Click a row to see its transactions for this month.</p>
        </Section>

        <Section className="lg:col-span-4" title="Committed every month" meta="before you spend" bodyClassName="px-4 pb-4 md:px-5">
          <div className="flex items-baseline justify-between">
            <Money value={committed} className="figure text-2xl" />
            <span className="text-xs text-ink-3">
              <Pct value={(committed / TAKE_HOME) * 100} decimals={0} /> of take-home pay
            </span>
          </div>
          {groups.map((g) => (
            <div key={g.label} className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-semibold text-ink-3">
                <span>{g.label}</span>
                <Money value={g.items.reduce((s, c) => s + c.amount, 0)} />
              </div>
              <ul>
                {g.items.map((c) => (
                  <li key={c.id} className="flex items-baseline justify-between gap-3 border-b border-rule py-1 text-sm last:border-0">
                    <span className="min-w-0 truncate text-ink">
                      {c.name}
                      <span className="ml-1.5 text-xs text-ink-3">{ledgerAccountShort(c.payFromId)}</span>
                    </span>
                    <Money value={c.amount} className="num shrink-0 text-ink-2" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-3 text-xs text-ink-3">
            Regular bills ({bills.map((c) => c.name.replace(" salary", "").replace("Society ", "")).slice(0, 4).join(", ")} and {bills.length - 4} more, <Money value={billTotal} />) are already inside the spending budget, so they are not counted again here.
          </p>
          <div className="mt-4 rounded-[3px] bg-paper-2 px-3 py-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-2">Take-home pay</span>
              <Money value={TAKE_HOME} className="num" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Less EMIs and savings</span>
              <Money value={-committed} className="num" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Less spending budget</span>
              <Money value={-totalBudget} className="num" />
            </div>
            <div className="mt-1 flex justify-between border-t border-rule-2 pt-1 font-semibold">
              <span>{planGap >= 0 ? "Unplanned each month" : "Plan exceeds pay by"}</span>
              <Money value={Math.abs(planGap)} className={cx("num", planGap < 0 && "text-amber")} />
            </div>
          </div>
          {planGap < 0 && (
            <p className="mt-2 text-xs text-ink-2">
              The plan only works if spending runs under budget. It has: the last six months averaged <Money value={avgSpend} className="font-semibold" />, leaving about <Money value={TAKE_HOME - committed - avgSpend} /> a month.
            </p>
          )}
        </Section>
      </div>

      <Section
        title="Cash flow"
        meta="12 months · money in against where it went"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => setChartAsTable((v) => !v)} aria-pressed={chartAsTable}>
            {chartAsTable ? <BarChart3 size={13} aria-hidden /> : <Table2 size={13} aria-hidden />}
            {chartAsTable ? "View as chart" : "View as table"}
          </button>
        }
        bodyClassName="px-4 pb-5 md:px-6"
      >
        <CashFlow asTable={chartAsTable} selected={month} onSelect={(mo) => BUDGET_MONTHS.includes(mo) && setMonth(mo)} />
      </Section>

      <Section title="Savings target" meta="share of take-home pay invested each month" className="border-t border-rule" bodyClassName="px-4 pb-6 md:px-6">
        <SavingsRates />
      </Section>
    </div>
  );
}

function CashFlow({ asTable, selected, onSelect }: { asTable: boolean; selected: MonthKey; onSelect: (m: MonthKey) => void }) {
  const { txns } = useLedger();
  const flows = monthFlows(txns);
  if (asTable)
    return (
      <TableWrap>
        <table className="tbl min-w-[640px]">
          <thead>
            <tr>
              <th>Month</th>
              <th className="r">Money in</th>
              <th className="r">Spending</th>
              <th className="r">EMIs</th>
              <th className="r">Invested</th>
              <th className="r">Net</th>
            </tr>
          </thead>
          <tbody className="num">
            {flows.map((f) => (
              <tr key={f.month} aria-selected={f.month === selected}>
                <td>{formatMonth(f.month, "MMM yyyy")}</td>
                <td className="r">
                  <Money value={f.income} />
                </td>
                <td className="r">
                  <Money value={f.spending} />
                </td>
                <td className="r">
                  <Money value={f.emis} />
                </td>
                <td className="r">
                  <Money value={f.invested} />
                </td>
                <td className="r">
                  <Money value={f.income - f.spending - f.emis - f.invested} sign="always" tone="gain" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    );
  return (
    <Columns
      label={`Money in versus money out by month, ${monthSpanLabel(flows[0].month, flows[flows.length - 1].month)}`}
      height={180}
      onSelect={(i) => onSelect(flows[i].month)}
      data={flows.map((f) => ({
        label: formatMonth(f.month, "MMM"),
        title: `${formatMonth(f.month, "MMMM yyyy")}${f.month === AS_OF_MONTH ? " (to date)" : ""} · net ${Math.round((f.income - f.spending - f.emis - f.invested) / 1000)}K`,
        values: { income: f.income, spending: f.spending, invested: f.invested, emis: f.emis },
        highlight: f.month === selected,
      }))}
      series={[
        { key: "income", label: "Money in", color: "var(--c1)" },
        { key: "spending", label: "Spending", color: "var(--c2)", stack: "out" },
        { key: "invested", label: "Invested", color: "var(--c3)", stack: "out" },
        { key: "emis", label: "EMIs", color: "var(--c4)", stack: "out" },
      ]}
    />
  );
}

function SavingsRates() {
  const { txns } = useLedger();
  const flows = monthFlows(txns);
  return (
    <ul className="grid grid-cols-3 gap-x-6 gap-y-3 sm:grid-cols-6 lg:grid-cols-12">
      {flows.map((f) => {
        const r = f.income ? f.invested / f.income : 0;
        return (
          <li key={f.month}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-ink-3">{formatMonth(f.month, "MMM")}</span>
              <span className={cx("num font-semibold", r >= SAVINGS_TARGET ? "text-ink" : "text-amber")}>{Math.round(r * 100)}%</span>
            </div>
            <Progress value={Math.min(1, r / 0.5)} tone={r >= SAVINGS_TARGET ? "ink" : "amber"} className="mt-1" height={4} />
          </li>
        );
      })}
      <li className="col-span-full text-xs text-ink-3">Bar length is out of 50%. Months below the 25% target show in amber. April includes the annual PPF deposit.</li>
    </ul>
  );
}

