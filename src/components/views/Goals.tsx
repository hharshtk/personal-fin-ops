"use client";

import { CASH_ACCOUNTS, GOALS, HOLDINGS, goalProgress, ledgerAccountName } from "@/lib/data";
import { AS_OF } from "@/lib/data";
import { durationLabel, formatDate, monthsBetween } from "@/lib/format";
import { useUI } from "@/components/workspace/state";
import { Money, Pct } from "@/components/ui/money";
import { Metric, MetricStrip, PageHeader, Progress, Section } from "@/components/ui/primitives";
import { GoalStatus } from "@/components/inspector/panels";
import { cx } from "@/components/ui/cx";
import { TableWrap } from "@/components/ui/table";

export function GoalsView() {
  const { inspect, inspector } = useUI();
  const goals = [...GOALS].sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1)).map((g) => ({ g, p: goalProgress(g.id) }));
  const saved = goals.reduce((s, x) => s + x.p.saved, 0);
  const target = goals.reduce((s, x) => s + x.g.target, 0);
  const monthly = goals.reduce((s, x) => s + x.g.monthlyPlan, 0);
  const behind = goals.filter((x) => x.g.status === "behind").length;
  const allocated = new Set(GOALS.flatMap((g) => g.allocations.map((a) => a.ref.id)));
  const freeAccounts = CASH_ACCOUNTS.filter((a) => !allocated.has(a.id));
  const freeHoldings = HOLDINGS.filter((h) => !allocated.has(h.id));
  const selected = inspector?.kind === "goal" ? inspector.id : null;
  // Square-root time scale: the next few years get most of the width
  const years = (date: string) => Math.max(0, Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) - 1) / 12 - 2026.83);
  const pos = (date: string) => (Math.sqrt(years(date)) / Math.sqrt(24.5)) * 100;

  return (
    <div>
      <PageHeader title="Goals" meta="What you're working towards, and the money already set aside for each" />
      <MetricStrip className="mt-4">
        <Metric label="Set aside" value={<Money value={saved} compact="pref" />} sub={`across ${GOALS.length} goals`} size="lg" />
        <Metric label="Total targets" value={<Money value={target} compact="pref" />} sub="in today's money" />
        <Metric label="Planned each month" value={<Money value={monthly} />} sub="SIPs, deposits and transfers" />
        <Metric label="Behind plan" value={`${behind} of ${GOALS.length}`} sub={behind ? "Emergency fund, Executive MBA" : "All on track"} />
      </MetricStrip>

      <Section title="Timeline" meta="years from today, compressed so near goals have room" bodyClassName="px-4 pb-5 md:px-6">
        <div className="relative mx-2 mt-1 h-[112px]">
          <div className="absolute inset-x-0 top-[56px] h-px bg-rule-2" />
          {[2027, 2030, 2035, 2040, 2050].map((y) => (
            <span key={y} className="absolute top-[60px] -translate-x-1/2 text-[11px] text-ink-3" style={{ left: `${pos(`${y}-01-01`)}%` }}>
              <span className="mx-auto mb-0.5 block h-1.5 w-px bg-rule-2" />
              {y}
            </span>
          ))}
          <span className="absolute top-[50px] size-3 -translate-x-1/2 rounded-full bg-paper ring-2 ring-pen" style={{ left: `${pos(AS_OF)}%` }} title="Today" />
          {goals.map(({ g }, i) => {
            const lane = [0, 2, 1, 3][i % 4];
            const above = lane < 2;
            const top = above ? (lane === 0 ? 30 : 4) : lane === 2 ? 78 : 96;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => inspect({ kind: "goal", id: g.id })}
                className="group absolute -translate-x-1/2 text-[11.5px] whitespace-nowrap text-ink-2 hover:text-pen"
                style={{ left: `${Math.min(94, pos(g.targetDate))}%`, top }}
              >
                <span className={cx("absolute left-1/2 w-px bg-ink-3/60 group-hover:bg-pen", above ? "top-full" : "bottom-full")} style={{ height: above ? 56 - top - 14 : top - 58 }} aria-hidden />
                <span className={cx("font-medium", g.status === "behind" && "text-amber")}>{g.name}</span> <span className="text-ink-3">{formatDate(g.targetDate, "MMM yy")}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Goals" meta="nearest first" className="border-t border-rule">
        <TableWrap>
          <table className="tbl min-w-[860px]">
            <thead>
              <tr>
                <th>Goal</th>
                <th className="w-[110px]">Target date</th>
                <th className="r w-[200px]">Saved of target</th>
                <th className="w-[22%]">Progress</th>
                <th className="r w-[120px]">Monthly plan</th>
                <th className="w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(({ g, p }) => (
                <tr key={g.id} data-clickable="true" aria-selected={selected === g.id} onClick={() => inspect({ kind: "goal", id: g.id })}>
                  <td className="max-w-0">
                    <div className="font-medium text-ink">{g.name}</div>
                    <div className="truncate text-xs text-ink-3">
                      {g.allocations.length} {g.allocations.length === 1 ? "source" : "sources"} ·{" "}
                      {g.allocations.map((a) => (a.ref.kind === "holding" ? HOLDINGS.find((h) => h.id === a.ref.id)?.name : ledgerAccountName(a.ref.id, { withMask: false }))).join(", ")}
                    </div>
                  </td>
                  <td>
                    <div className="text-ink">{formatDate(g.targetDate, "MMM yyyy")}</div>
                    <div className="text-xs text-ink-3">{durationLabel(Math.max(0, monthsBetween(AS_OF, g.targetDate)))} away</div>
                  </td>
                  <td className="r num">
                    <Money value={p.saved} compact className="font-semibold" /> <span className="text-ink-3">/ <Money value={g.target} compact /></span>
                  </td>
                  <td>
                    <div className="flex min-w-[140px] items-center gap-2">
                      <Progress value={p.ratio} tone={g.status === "behind" ? "amber" : "ink"} className="flex-1" />
                      <Pct value={p.ratio * 100} decimals={0} className="num w-9 text-right text-xs text-ink-3" />
                    </div>
                  </td>
                  <td className="r num text-ink-2">
                    <Money value={g.monthlyPlan} />
                  </td>
                  <td>
                    <GoalStatus status={g.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="px-4 py-3 text-xs text-ink-3 md:px-6">Status compares each goal against the plan you set; Arthashala does not project returns or give advice.</p>
      </Section>

      <Section title="Not assigned to any goal" meta="free to earmark" className="border-t border-rule" bodyClassName="px-4 pb-6 md:px-6">
        <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...freeAccounts.map((a) => ({ id: a.id, kind: "account" as const, label: ledgerAccountName(a.id), value: a.balance })), ...freeHoldings.map((h) => ({ id: h.id, kind: "holding" as const, label: h.name, value: h.current }))]
            .sort((a, b) => b.value - a.value)
            .map((x) => (
              <button key={x.id} type="button" onClick={() => inspect({ kind: x.kind, id: x.id })} className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5 text-left text-sm hover:text-pen">
                <span className="truncate">{x.label}</span>
                <Money value={x.value} compact className="num shrink-0 text-ink-2" />
              </button>
            ))}
        </div>
      </Section>
    </div>
  );
}
