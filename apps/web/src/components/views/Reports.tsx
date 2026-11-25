"use client";

import { useState } from "react";
import { AS_OF, AS_OF_MONTH, CATEGORIES, LOANS, loanSchedule, monthRange, loanStatus, monthFlows, netWorthHistory, netWorthNow, portfolioSummary } from "@myfinancespace/core/data";
import { addDays, addMonths, formatMonth, monthOf, monthSpanLabel } from "@myfinancespace/core/format";
import { useLedger, useUI } from "@/components/workspace/state";
import { Delta, Money, Pct } from "@/components/ui/money";
import { Metric, MetricStrip, PageHeader, Section } from "@/components/ui/primitives";
import { Columns } from "@/components/charts/Columns";
import { TrendChart } from "@/components/charts/TrendChart";
import { SegmentBar } from "@/components/charts/SegmentBar";
import { TableWrap } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";
import { useRouter } from "next/navigation";

const REPORTS = [
  { id: "flow", label: "Income & expenses" },
  { id: "spending", label: "Spending breakdown" },
  { id: "networth", label: "Net worth" },
  { id: "allocation", label: "Asset allocation" },
  { id: "debt", label: "Debt" },
] as const;
type ReportId = (typeof REPORTS)[number]["id"];

export function ReportsView() {
  const [tab, setTab] = useState<ReportId>("flow");
  return (
    <div>
      <PageHeader title="Reports" meta="Patterns over time, with the numbers behind every chart">
        <div className="tabs mt-4 overflow-x-auto" role="tablist" aria-label="Report">
          {REPORTS.map((r) => (
            <button key={r.id} id={`tab-${r.id}`} type="button" role="tab" aria-selected={tab === r.id} aria-controls={`panel-${r.id}`} className="tab" onClick={() => setTab(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </PageHeader>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "flow" && <FlowReport />}
        {tab === "spending" && <SpendingReport />}
        {tab === "networth" && <NetWorthReport />}
        {tab === "allocation" && <AllocationReport />}
        {tab === "debt" && <DebtReport />}
      </div>
    </div>
  );
}

function Explain({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[72ch] px-4 pt-1 pb-3 text-sm text-ink-2 md:px-6">{children}</p>;
}

function FlowReport() {
  const { txns } = useLedger();
  const [span, setSpan] = useState<6 | 12>(12);
  const all = monthFlows(txns);
  const flows = all.slice(-span);
  const complete = flows.filter((f) => f.month !== AS_OF_MONTH);
  const avg = (k: "income" | "spending" | "emis" | "invested") => complete.reduce((s, f) => s + f[k], 0) / complete.length;
  return (
    <>
      <MetricStrip className="mt-4">
        <Metric label="Average money in" value={<Money value={avg("income")} />} sub={`${complete.length} complete months`} />
        <Metric label="Average spending" value={<Money value={avg("spending")} />} sub={<><Pct value={(avg("spending") / avg("income")) * 100} decimals={0} /> of income</>} />
        <Metric label="Average EMIs" value={<Money value={avg("emis")} />} sub={<><Pct value={(avg("emis") / avg("income")) * 100} decimals={0} /> of income</>} />
        <Metric label="Average invested" value={<Money value={avg("invested")} />} sub={<><Pct value={(avg("invested") / avg("income")) * 100} decimals={0} /> of income</>} />
      </MetricStrip>
      <Section
        title="Money in against where it went"
        actions={
          <div className="seg" role="group" aria-label="Period">
            {([6, 12] as const).map((n) => (
              <button key={n} type="button" aria-pressed={span === n} onClick={() => setSpan(n)}>
                {n} months
              </button>
            ))}
          </div>
        }
        bodyClassName="px-4 pb-4 md:px-6"
      >
        <Columns
          label={`Income versus spending, EMIs and investments over ${span} months`}
          height={200}
          data={flows.map((f) => ({ label: formatMonth(f.month, "MMM"), title: formatMonth(f.month, "MMMM yyyy") + (f.month === AS_OF_MONTH ? " (to date)" : ""), values: { income: f.income, spending: f.spending, invested: f.invested, emis: f.emis }, highlight: f.month === AS_OF_MONTH }))}
          series={[
            { key: "income", label: "Money in", color: "var(--c1)" },
            { key: "spending", label: "Spending", color: "var(--c2)", stack: "out" },
            { key: "invested", label: "Invested", color: "var(--c3)", stack: "out" },
            { key: "emis", label: "EMIs", color: "var(--c4)", stack: "out" },
          ]}
        />
      </Section>
      <Explain>
        July and August stand out: the annual bonus and a freelance invoice lifted income, while the Goa trip pushed August spending past ₹1 L. April&rsquo;s investment spike is the yearly PPF deposit. November is partial, with the card bill and NPS still to come.
      </Explain>
      <TableWrap className="border-t border-rule">
        <table className="tbl min-w-[720px]">
          <thead>
            <tr>
              <th>Month</th>
              <th className="r">Money in</th>
              <th className="r">Spending</th>
              <th className="r">EMIs</th>
              <th className="r">Invested</th>
              <th className="r">Left over</th>
              <th className="r">Invested share</th>
            </tr>
          </thead>
          <tbody className="num">
            {[...flows].reverse().map((f) => {
              const left = f.income - f.spending - f.emis - f.invested;
              return (
                <tr key={f.month}>
                  <td className="font-sans">{formatMonth(f.month, "MMM yyyy")}{f.month === AS_OF_MONTH && <span className="ml-1 text-xs text-ink-3">to date</span>}</td>
                  <td className="r"><Money value={f.income} /></td>
                  <td className="r"><Money value={f.spending} /></td>
                  <td className="r"><Money value={f.emis} /></td>
                  <td className="r"><Money value={f.invested} /></td>
                  <td className="r font-semibold"><Money value={left} sign="always" tone="gain" /></td>
                  <td className="r text-ink-2"><Pct value={(f.invested / f.income) * 100} decimals={0} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}

const MONTH_START = `${AS_OF_MONTH}-01`;
/** The six complete months before AS_OF_MONTH. */
const COMPLETE_MONTHS = monthRange(monthOf(addMonths(MONTH_START, -6)), monthOf(addMonths(MONTH_START, -1)));

function SpendingReport() {
  const { txns } = useLedger();
  const router = useRouter();
  const [range, setRange] = useState<"6m" | "month">("6m");
  const months = range === "6m" ? COMPLETE_MONTHS : [AS_OF_MONTH];
  const cats = CATEGORIES.filter((c) => c.budget).map((c) => {
    const actual = -txns.filter((t) => t.categoryId === c.id && months.includes(monthOf(t.date)) && (t.type === "expense" || t.type === "refund")).reduce((s, t) => s + t.amount, 0);
    return { c, actual, perMonth: actual / months.length, budget: c.budget! };
  });
  const sorted = [...cats].sort((a, b) => b.actual - a.actual);
  const total = sorted.reduce((s, x) => s + x.actual, 0);
  const max = sorted[0]?.actual || 1;
  return (
    <>
      <Section
        className="mt-2"
        title={range === "6m" ? monthSpanLabel(COMPLETE_MONTHS[0], COMPLETE_MONTHS[COMPLETE_MONTHS.length - 1]) : `${formatMonth(AS_OF_MONTH, "MMMM yyyy")} to date`}
        meta={<>total <Money value={total} /></>}
        actions={
          <div className="seg" role="group" aria-label="Period">
            <button type="button" aria-pressed={range === "6m"} onClick={() => setRange("6m")}>
              Last 6 complete months
            </button>
            <button type="button" aria-pressed={range === "month"} onClick={() => setRange("month")}>
              This month
            </button>
          </div>
        }
        bodyClassName="pb-2"
      >
        <ul role="list" aria-label="Spending by category, largest first">
          {sorted.map((x) => (
            <li key={x.c.id}>
              <button
                type="button"
                className="grid w-full grid-cols-[minmax(120px,200px)_1fr_auto] items-center gap-4 border-t border-rule px-4 py-2 text-left first:border-t-0 hover:bg-paper-2 md:px-6"
                onClick={() => router.push(`/transactions?category=${x.c.id}&period=custom&from=${months[0]}-01&to=${range === "month" ? AS_OF : addDays(MONTH_START, -1)}`)}
              >
                <span className="truncate text-sm text-ink">{x.c.name}</span>
                <span className="relative h-5">
                  <span className="absolute inset-y-[3px] left-0 rounded-r-[4px] bg-[var(--c1)]" style={{ width: `${(x.actual / max) * 100}%` }} />
                </span>
                <span className="num w-[220px] text-right text-sm">
                  <Money value={x.actual} className="font-semibold" />
                  <span className="ml-2 text-xs text-ink-3">
                    <Pct value={(x.actual / total) * 100} decimals={0} /> · <Money value={x.perMonth} compact />/mo
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <Explain>
        Bars share one colour because the categories are the subject, not a comparison of series. Per-month averages sit beside each total; compare them with each category&apos;s monthly budget in Budget & cash flow. Select a row for its transactions.
      </Explain>
    </>
  );
}

function NetWorthReport() {
  const { txns } = useLedger();
  const hist = netWorthHistory(txns);
  const now = hist[hist.length - 1];
  const first = hist[0];
  return (
    <>
      <MetricStrip className="mt-4">
        <Metric label="Net worth now" value={<Money value={now.netWorth} compact="pref" />} />
        <Metric label="24 months ago" value={<Money value={first.netWorth} compact="pref" />} sub={formatMonth(first.month, "MMMM yyyy")} />
        <Metric label="Change" value={<Money value={now.netWorth - first.netWorth} compact="pref" sign="always" tone="gain" />} sub={<Pct value={((now.netWorth - first.netWorth) / first.netWorth) * 100} sign />} />
        <Metric label="Of which, home revaluation" value={<Money value={now.realEstate - first.realEstate} compact="pref" sign="always" />} sub="Estimates, not sales" />
      </MetricStrip>
      <Section title="Net worth by month-end" bodyClassName="px-4 pb-4 md:px-6">
        <TrendChart height={220} label="Net worth by month-end over 24 months" xEvery={3} points={hist.map((h) => ({ label: formatMonth(h.month, "MMM yy"), title: formatMonth(h.month, "MMMM yyyy"), value: h.netWorth }))} />
      </Section>
      <Explain>Most of the rise comes from steady investing and loan repayment; property revaluations add steps in April 2025, October 2025 and April 2026.</Explain>
      <TableWrap className="border-t border-rule">
        <table className="tbl min-w-[560px]">
          <thead>
            <tr>
              <th>Month-end</th>
              <th className="r">Assets</th>
              <th className="r">Liabilities</th>
              <th className="r">Net worth</th>
              <th className="r">Change</th>
            </tr>
          </thead>
          <tbody className="num">
            {[...hist].reverse().map((h, i, arr) => (
              <tr key={h.month}>
                <td className="font-sans">{formatMonth(h.month, "MMM yyyy")}</td>
                <td className="r"><Money value={h.assets} compact /></td>
                <td className="r"><Money value={-h.liabilities} compact /></td>
                <td className="r font-semibold"><Money value={h.netWorth} compact /></td>
                <td className="r">{arr[i + 1] ? <Delta value={h.netWorth - arr[i + 1].netWorth} compact className="justify-end text-xs" /> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}

function AllocationReport() {
  const { inspect } = useUI();
  const p = portfolioSummary();
  const nw = netWorthNow();
  const equity = p.byClass.filter((c) => c.id === "mf" || c.id === "equity" || c.id === "international").reduce((s, c) => s + c.current, 0);
  return (
    <>
      <MetricStrip className="mt-4">
        <Metric label="Portfolio" value={<Money value={p.current} compact="pref" />} sub={<>of <Money value={nw.netWorth} compact /> net worth</>} />
        <Metric label="Equity exposure" value={<Pct value={(equity / p.current) * 100} decimals={0} />} sub="Funds, shares and international" />
        <Metric label="Retirement accounts" value={<Pct value={(p.byClass.find((c) => c.id === "retirement")!.current / p.current) * 100} decimals={0} />} sub="EPF, PPF and NPS" />
        <Metric label="Outside India" value={<Pct value={(p.byClass.find((c) => c.id === "international")!.current / p.current) * 100} decimals={0} />} sub="Nasdaq FoF and US stocks" />
      </MetricStrip>
      <Section title="By asset class" bodyClassName="px-4 pb-5 md:px-6">
        <SegmentBar variant="tall" label="Portfolio by asset class" segments={p.byClass.map((c) => ({ key: c.id, label: c.name, value: c.current, color: `var(--c${c.slot})` }))} />
      </Section>
      <TableWrap className="border-t border-rule">
        <table className="tbl min-w-[620px]">
          <thead>
            <tr>
              <th>Class</th>
              <th className="r">Invested</th>
              <th className="r">Current</th>
              <th className="r">Gain</th>
              <th className="r">Weight</th>
            </tr>
          </thead>
          <tbody className="num">
            {p.byClass.map((c) => (
              <tr key={c.id} data-clickable="true" onClick={() => inspect({ kind: "holding", id: c.id === "retirement" ? "epf" : c.id === "mf" ? "ppfas" : c.id === "equity" ? "hdfcbank" : c.id === "international" ? "mo-nasdaq" : c.id === "gold" ? "sgb" : "icici-corp" })}>
                <td className="font-sans">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-[2px]" style={{ background: `var(--c${c.slot})` }} aria-hidden />
                    {c.name}
                  </span>
                </td>
                <td className="r"><Money value={c.invested} compact /></td>
                <td className="r font-semibold"><Money value={c.current} compact /></td>
                <td className="r"><Money value={c.gain} compact sign="always" tone="gain" /></td>
                <td className="r text-ink-2"><Pct value={(c.current / p.current) * 100} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Explain>Selecting a class opens its largest holding. MyFinanceSpace shows the split as it stands; it does not suggest a target mix.</Explain>
    </>
  );
}

function DebtReport() {
  const { txns } = useLedger();
  const hist = netWorthHistory(txns);
  const nw = netWorthNow(txns);
  const rows = LOANS.map((l) => {
    const s = loanStatus(l.id);
    const sched = loanSchedule(l.id);
    const thisYear = sched.filter((r) => r.date.startsWith(AS_OF.slice(0, 4)) && r.date <= AS_OF).reduce((a, r) => a + r.interest, 0);
    return { l, s, thisYear };
  });
  const emis = LOANS.reduce((s, l) => s + l.emi, 0);
  return (
    <>
      <MetricStrip className="mt-4">
        <Metric label="Owed today" value={<Money value={nw.liabilities} compact="pref" />} sub={<Delta value={nw.liabilities - hist[0].liabilities} compact invert />} />
        <Metric label="EMIs to take-home" value={<Pct value={(emis / 246800) * 100} decimals={0} />} sub={<Money value={emis} />} />
        <Metric label={`Interest paid in ${AS_OF.slice(0, 4)}`} value={<Money value={rows.reduce((s, r) => s + r.thisYear, 0)} compact="pref" />} sub={`January to ${formatMonth(AS_OF_MONTH, "MMMM")}`} />
        <Metric label="Interest still to pay" value={<Money value={rows.reduce((s, r) => s + r.s.interestRemaining, 0)} compact="pref" />} sub="If every loan runs to term" />
      </MetricStrip>
      <Section title="Total owed by month-end" bodyClassName="px-4 pb-4 md:px-6">
        <TrendChart height={180} color="var(--c5)" label="Total liabilities by month-end" xEvery={3} points={hist.map((h) => ({ label: formatMonth(h.month, "MMM yy"), title: formatMonth(h.month, "MMMM yyyy"), value: h.liabilities }))} />
      </Section>
      <Explain>Debt falls by roughly ₹40,000 a month as EMIs repay principal. The rise in December 2025 is the ₹2 L borrowed from your father for the apartment interiors.</Explain>
      <TableWrap className="border-t border-rule">
        <table className="tbl min-w-[720px]">
          <thead>
            <tr>
              <th>Loan</th>
              <th className="r">Rate</th>
              <th className="r">Outstanding</th>
              <th className="r">Interest in 2026</th>
              <th className="r">Interest to come</th>
              <th className="r">Ends</th>
            </tr>
          </thead>
          <tbody className="num">
            {rows.map(({ l, s, thisYear }) => (
              <tr key={l.id}>
                <td className="font-sans">{l.name} <span className="text-xs text-ink-3">{l.lender}</span></td>
                <td className="r text-ink-2">{l.rate}%</td>
                <td className="r font-semibold"><Money value={s.outstanding} /></td>
                <td className="r"><Money value={thisYear} /></td>
                <td className={cx("r", s.interestRemaining > 1e6 && "text-ink")}><Money value={s.interestRemaining} /></td>
                <td className="r text-ink-2">{formatMonth(s.endDate.slice(0, 7), "MMM yyyy")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
