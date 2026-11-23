"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { useEffect } from "react";
import type { AssetClass } from "@/lib/types";
import { AS_OF, AS_OF_MONTH, ASSET_CLASSES, HOLDINGS, SIPS, getGoal, getHolding, ledgerAccountShort, portfolioSummary } from "@/lib/data";
import { addMonths, formatDate, parts } from "@/lib/format";
import { useUI } from "@/components/workspace/state";
import { Money, Pct } from "@/components/ui/money";
import { DateMark, Metric, MetricStrip, PageHeader, Section } from "@/components/ui/primitives";
import { SegmentBar } from "@/components/charts/SegmentBar";
import { SortTh, TableWrap, useSort } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";

export function InvestmentsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { inspect, inspector } = useUI();
  const cls = (params.get("class") ?? "all") as AssetClass | "all";
  const focus = params.get("h");
  const p = portfolioSummary();

  useEffect(() => {
    if (focus && getHolding(focus)) inspect({ kind: "holding", id: focus });
  }, [focus, inspect]);

  const setClass = (c: string) => {
    const next = new URLSearchParams(params.toString());
    if (c === "all") next.delete("class");
    else next.set("class", c);
    next.delete("h");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const rows = HOLDINGS.filter((h) => cls === "all" || h.assetClass === cls);
  const { sorted, sort, toggle } = useSort(
    rows,
    {
      name: (h) => h.name,
      current: (h) => h.current,
      invested: (h) => h.invested,
      gain: (h) => h.current - h.invested,
      gainPct: (h) => (h.current - h.invested) / h.invested,
      xirr: (h) => h.xirr ?? 0,
      weight: (h) => h.current,
    },
    { key: "current", dir: "desc" },
  );
  const sub = rows.reduce((a, h) => ({ inv: a.inv + h.invested, cur: a.cur + h.current }), { inv: 0, cur: 0 });
  const selected = inspector?.kind === "holding" ? inspector.id : null;
  const nextSip = (day: number) => (parts(AS_OF).d < day ? `${AS_OF_MONTH}-${String(day).padStart(2, "0")}` : addMonths(`${AS_OF_MONTH}-01`, 1, day));

  return (
    <div>
      <PageHeader title="Investments" meta={`Market-linked and retirement holdings · prices as of ${formatDate(AS_OF)} close`}
        actions={<Link href="/employee-equity" className="btn"><BriefcaseBusiness size={15} aria-hidden /> Employee equity</Link>} />
      <MetricStrip className="mt-4">
        <Metric label="Current value" value={<Money value={p.current} compact="pref" />} sub={`${HOLDINGS.length} holdings on 5 platforms`} size="lg" />
        <Metric label="Invested" value={<Money value={p.invested} compact="pref" />} sub="Cost of units still held" />
        <Metric label="Unrealised gain" value={<Money value={p.gain} compact="pref" sign="always" tone="gain" />} sub={<Pct value={(p.gain / p.invested) * 100} sign tone="gain" />} />
        <Metric label="Portfolio XIRR" value={`${p.xirr.toFixed(1)}%`} sub="Annualised, since 2016" />
        <Metric label="Last session" value={<Money value={p.dayChange} compact="pref" sign="always" tone="gain" />} sub="Market-linked holdings" />
      </MetricStrip>

      <div className="grid gap-px border-b border-rule bg-rule lg:grid-cols-12 [&>*]:bg-paper">
        <Section className="lg:col-span-7" title="Allocation" meta="by asset class · click to filter" bodyClassName="px-4 pb-5 md:px-6">
          <SegmentBar
            variant="tall"
            label="Portfolio allocation by asset class"
            showLegend={false}
            segments={p.byClass.map((c) => ({ key: c.id, label: c.name, value: c.current, color: `var(--c${c.slot})`, onClick: () => setClass(c.id) }))}
          />
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-3">
                <th className="pb-1.5 text-left font-medium">Class</th>
                <th className="pb-1.5 text-right font-medium">Value</th>
                <th className="hidden pb-1.5 text-right font-medium sm:table-cell">Gain</th>
                <th className="pb-1.5 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody className="num">
              {p.byClass.map((c) => (
                <tr key={c.id} className={cx("cursor-pointer border-t border-rule hover:bg-paper-2", cls === c.id && "bg-pen-wash")} onClick={() => setClass(cls === c.id ? "all" : c.id)}>
                  <td className="py-1.5">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-[2px]" style={{ background: `var(--c${c.slot})` }} aria-hidden />
                      <span className="font-sans text-ink">{c.name}</span>
                      <span className="text-xs text-ink-3">{c.count}</span>
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    <Money value={c.current} compact />
                  </td>
                  <td className="hidden py-1.5 text-right sm:table-cell">
                    <Pct value={(c.gain / c.invested) * 100} sign tone="gain" />
                  </td>
                  <td className="py-1.5 text-right text-ink-2">
                    <Pct value={(c.current / p.current) * 100} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section className="lg:col-span-5" title="Monthly contributions" meta={`${SIPS.length} active · ₹${SIPS.reduce((s, x) => s + x.amount, 0).toLocaleString("en-IN")} a month`} bodyClassName="pb-3">
          <ul>
            {SIPS.map((s) => {
              const hd = getHolding(s.holdingId)!;
              const next = nextSip(s.day);
              return (
                <li key={s.id} className="border-t border-rule first:border-t-0">
                  <button type="button" onClick={() => inspect({ kind: "holding", id: hd.id })} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-paper-2 md:px-5">
                    <DateMark date={next} className="w-[50px] shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{hd.name}</span>
                      <span className="block text-xs text-ink-3">
                        {s.kind} on the {s.day}th · from {ledgerAccountShort(s.debitAccountId)} · since {formatDate(s.startedOn, "MMM yyyy")}
                      </span>
                    </span>
                    <Money value={s.amount} className="num text-sm font-semibold" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-4 pt-2 text-xs text-ink-3 md:px-5">EPF contributions (₹33,600 a month with the employer share) arrive through payroll and are not listed here.</p>
        </Section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-6">
        <div className="tabs overflow-x-auto" role="tablist" aria-label="Asset class">
          {[{ id: "all", name: "All holdings" }, ...ASSET_CLASSES].map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cls === c.id} className="tab" onClick={() => setClass(c.id)}>
              {c.id === "retirement" ? "Retirement" : c.name}
              <span className="ml-1.5 text-xs text-ink-3">{c.id === "all" ? HOLDINGS.length : HOLDINGS.filter((h) => h.assetClass === c.id).length}</span>
            </button>
          ))}
        </div>
      </div>
      <TableWrap className="@container">
        <table className="tbl min-w-[640px]" aria-label="Holdings">
          <thead>
            <tr>
              <SortTh k="name" sort={sort} onSort={toggle}>
                Holding
              </SortTh>
              <th className="r hidden @5xl:table-cell w-[90px]">Units</th>
              <th className="r hidden @5xl:table-cell w-[100px]">Avg cost</th>
              <th className="r hidden @5xl:table-cell w-[100px]">Price</th>
              <SortTh k="invested" sort={sort} onSort={toggle} align="right" className="w-[120px]">
                Invested
              </SortTh>
              <SortTh k="current" sort={sort} onSort={toggle} align="right" className="w-[120px]">
                Current
              </SortTh>
              <SortTh k="gain" sort={sort} onSort={toggle} align="right" className="w-[150px]">
                Gain
              </SortTh>
              <SortTh k="xirr" sort={sort} onSort={toggle} align="right" className="hidden w-[80px] @3xl:table-cell">
                XIRR
              </SortTh>
              <SortTh k="weight" sort={sort} onSort={toggle} align="right" className="w-[80px]">
                Weight
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => {
              const gain = h.current - h.invested;
              const c = ASSET_CLASSES.find((a) => a.id === h.assetClass)!;
              return (
                <tr key={h.id} data-clickable="true" aria-selected={selected === h.id} onClick={() => inspect({ kind: "holding", id: h.id })}>
                  <td className="max-w-0">
                    <div className="flex items-center gap-2">
                      <span className="size-2 shrink-0 rounded-[2px]" style={{ background: `var(--c${c.slot})` }} aria-hidden />
                      <span className="truncate font-medium text-ink">{h.name}</span>
                      {h.symbol && /^[A-Z]+$/.test(h.symbol) && <span className="text-xs text-ink-3">{h.symbol}</span>}
                    </div>
                    <div className="truncate pl-4 text-xs text-ink-3">
                      {h.type} · {h.platform}
                      {h.goalId && <> · {getGoal(h.goalId)?.name}</>}
                    </div>
                  </td>
                  <td className="r num hidden text-ink-2 @5xl:table-cell">{h.units !== undefined ? h.units.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</td>
                  <td className="r num hidden text-ink-2 @5xl:table-cell">{h.avgCost !== undefined ? <Money value={h.avgCost} decimals={2} /> : "—"}</td>
                  <td className="r num hidden text-ink-2 @5xl:table-cell">{h.price !== undefined ? <Money value={h.price} decimals={2} /> : "—"}</td>
                  <td className="r num">
                    <Money value={h.invested} />
                  </td>
                  <td className="r num font-semibold">
                    <Money value={h.current} />
                  </td>
                  <td className="r num">
                    <Money value={gain} sign="always" tone="gain" />
                    <div className="text-xs">
                      <Pct value={(gain / h.invested) * 100} sign tone="gain" />
                    </div>
                  </td>
                  <td className="r num hidden text-ink-2 @3xl:table-cell">{h.xirr !== undefined ? `${h.xirr.toFixed(1)}%` : "—"}</td>
                  <td className="r num text-ink-2">
                    <Pct value={(h.current / p.current) * 100} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="h-10 border-t border-rule-2 pl-4 text-sm font-semibold md:pl-6">{cls === "all" ? "Total" : ASSET_CLASSES.find((a) => a.id === cls)?.name}</td>
              <td colSpan={3} className="hidden border-t border-rule-2 @5xl:table-cell" />
              <td className="r num border-t border-rule-2 px-2.5 font-semibold">
                <Money value={sub.inv} />
              </td>
              <td className="r num border-t border-rule-2 px-2.5 font-semibold">
                <Money value={sub.cur} />
              </td>
              <td className="r num border-t border-rule-2 px-2.5 font-semibold">
                <Money value={sub.cur - sub.inv} sign="always" tone="gain" />
              </td>
              <td className="hidden border-t border-rule-2 @3xl:table-cell" />
              <td className="r num border-t border-rule-2 px-2.5 pr-4 text-ink-2 md:pr-6">
                <Pct value={(sub.cur / p.current) * 100} />
              </td>
            </tr>
          </tfoot>
        </table>
      </TableWrap>
      <p className="px-4 py-3 text-xs text-ink-3 md:px-6">
        Bank balances, deposits and physical gold are not investments here; they appear under Accounts and Net worth so nothing is counted twice. Prices are fixed demonstration values; no market data is fetched.
      </p>
    </div>
  );
}
