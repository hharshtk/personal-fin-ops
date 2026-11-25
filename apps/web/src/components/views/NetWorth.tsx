"use client";

import { Fragment, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Table2 } from "lucide-react";
import type { EntityRef } from "@myfinancespace/core/types";
import {
  AS_OF,
  AS_OF_MONTH,
  ASSETS,
  CARDS,
  CASH_ACCOUNTS,
  HOLDINGS,
  LOANS,
  accountBalance,
  cardStatus,
  ledgerAccountName,
  loanStatus,
  netWorthHistory,
  netWorthNow,
} from "@myfinancespace/core/data";
import { formatDate, formatMonth, monthSpanLabel } from "@myfinancespace/core/format";
import { useLedger, useUI } from "@/components/workspace/state";
import { Delta, Money, Pct } from "@/components/ui/money";
import { Metric, MetricStrip, PageHeader, Section, Tag } from "@/components/ui/primitives";
import { TrendChart } from "@/components/charts/TrendChart";
import { Columns } from "@/components/charts/Columns";
import { SegmentBar } from "@/components/charts/SegmentBar";
import { TableWrap } from "@/components/ui/table";

type Liquidity = "Available now" | "Days to sell" | "Locked" | "Illiquid";
interface Line {
  key: string;
  label: string;
  value: number;
  /** previous month-end, only where the history records this group */
  prev?: number;
  liquidity?: Liquidity;
  items: { ref: EntityRef; label: string; value: number }[];
}

export function NetWorthView() {
  const { txns } = useLedger();
  const { inspect } = useUI();
  const [open, setOpen] = useState<Set<string>>(() => new Set(["investments"]));
  const [asTable, setAsTable] = useState(false);
  const nw = netWorthNow(txns);
  const hist = netWorthHistory(txns);
  const prev = hist[hist.length - 2];
  const yearAgo = hist[hist.length - 13];
  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const assets: Line[] = [
    {
      key: "liquid",
      label: "Bank balances & cash",
      value: nw.liquid,
      liquidity: "Available now",
      items: CASH_ACCOUNTS.filter((a) => a.liquid).map((a) => ({ ref: { kind: "account", id: a.id }, label: ledgerAccountName(a.id), value: accountBalance(a.id, txns) })),
    },
    {
      key: "deposits",
      label: "Fixed & recurring deposits",
      value: nw.deposits,
      liquidity: "Days to sell",
      items: CASH_ACCOUNTS.filter((a) => !a.liquid).map((a) => ({ ref: { kind: "account", id: a.id }, label: ledgerAccountName(a.id), value: a.balance })),
    },
    {
      key: "investments",
      label: "Investments",
      value: nw.investments,
      prev: prev.investments,
      liquidity: "Days to sell",
      items: HOLDINGS.filter((h) => h.assetClass !== "retirement")
        .sort((a, b) => b.current - a.current)
        .map((h) => ({ ref: { kind: "holding", id: h.id }, label: h.name, value: h.current })),
    },
    {
      key: "retirement",
      label: "Retirement savings",
      value: nw.retirement,
      prev: prev.retirement,
      liquidity: "Locked",
      items: HOLDINGS.filter((h) => h.assetClass === "retirement").map((h) => ({ ref: { kind: "holding", id: h.id }, label: `${h.name} · ${h.platform}`, value: h.current })),
    },
    {
      key: "realEstate",
      label: "Real estate",
      value: nw.realEstate,
      prev: prev.realEstate,
      liquidity: "Illiquid",
      items: ASSETS.filter((a) => a.kind === "real_estate").map((a) => ({ ref: { kind: "asset", id: a.id }, label: a.name, value: a.currentValue })),
    },
    {
      key: "vehicles",
      label: "Vehicles",
      value: nw.vehicles,
      prev: prev.vehicles,
      liquidity: "Illiquid",
      items: ASSETS.filter((a) => a.kind === "vehicle").map((a) => ({ ref: { kind: "asset", id: a.id }, label: a.name, value: a.currentValue })),
    },
    {
      key: "gold",
      label: "Physical gold",
      value: nw.gold,
      prev: prev.gold,
      liquidity: "Illiquid",
      items: ASSETS.filter((a) => a.kind === "gold").map((a) => ({ ref: { kind: "asset", id: a.id }, label: a.name, value: a.currentValue })),
    },
  ];
  const liabilities: Line[] = [
    {
      key: "loans",
      label: "Loans",
      value: nw.loans,
      items: LOANS.map((l) => ({ ref: { kind: "loan", id: l.id }, label: `${l.name} · ${l.lender}`, value: loanStatus(l.id).outstanding })),
    },
    {
      key: "cards",
      label: "Credit cards",
      value: nw.cards,
      items: CARDS.map((c) => ({ ref: { kind: "card", id: c.id }, label: ledgerAccountName(c.id), value: cardStatus(c.id, txns).outstanding })),
    },
  ];

  const ladder: { key: Liquidity; color: string }[] = [
    { key: "Available now", color: "var(--c1)" },
    { key: "Days to sell", color: "var(--c3)" },
    { key: "Locked", color: "var(--c5)" },
    { key: "Illiquid", color: "var(--c4)" },
  ];

  const renderGroup = (lines: Line[], kind: "asset" | "liability") =>
    lines.map((l) => {
      const isOpen = open.has(l.key);
      const total = kind === "asset" ? nw.assets : nw.liabilities;
      return (
        <Fragment key={l.key}>
          <tr data-clickable="true" onClick={() => toggle(l.key)} aria-expanded={isOpen}>
            <td>
              <button type="button" className="flex items-center gap-1.5 font-medium text-ink" aria-label={`${isOpen ? "Collapse" : "Expand"} ${l.label}`} onClick={(e) => (e.stopPropagation(), toggle(l.key))}>
                {isOpen ? <ChevronDown size={14} className="text-ink-3" aria-hidden /> : <ChevronRight size={14} className="text-ink-3" aria-hidden />}
                {l.label}
                <span className="text-xs font-normal text-ink-3">{l.items.length}</span>
              </button>
            </td>
            <td className="hidden sm:table-cell">
              {l.liquidity && <Tag tone={l.liquidity === "Available now" ? "green" : l.liquidity === "Illiquid" ? "neutral" : l.liquidity === "Locked" ? "neutral" : "pen"}>{l.liquidity}</Tag>}
            </td>
            <td className="r num text-ink-3">
              <Pct value={(l.value / total) * 100} />
            </td>
            <td className="r num hidden md:table-cell">
              {l.prev !== undefined ? <Delta value={l.value - l.prev} compact invert={kind === "liability"} className="justify-end text-xs" /> : <span className="text-xs text-ink-3">—</span>}
            </td>
            <td className="r num font-semibold">
              <Money value={kind === "liability" ? -l.value : l.value} />
            </td>
          </tr>
          {isOpen &&
            l.items.map((it) => (
              <tr key={it.ref.id} data-clickable="true" className="bg-paper-2/50" onClick={() => inspect(it.ref)}>
                <td className="pl-10!">
                  <span className="text-ink-2 hover:text-pen">{it.label}</span>
                </td>
                <td className="hidden sm:table-cell" />
                <td className="r num text-xs text-ink-3">
                  <Pct value={(it.value / total) * 100} />
                </td>
                <td className="hidden md:table-cell" />
                <td className="r num text-ink-2">
                  <Money value={kind === "liability" ? -it.value : it.value} />
                </td>
              </tr>
            ))}
        </Fragment>
      );
    });

  return (
    <div>
      <PageHeader title="Net worth" meta={`What you own minus what you owe · as of ${formatDate(AS_OF)}`} />
      <MetricStrip className="mt-4">
        <Metric label="Net worth" value={<Money value={nw.netWorth} compact="pref" />} sub={<Delta value={nw.netWorth - prev.netWorth} pct={((nw.netWorth - prev.netWorth) / prev.netWorth) * 100} />} size="lg" />
        <Metric label="Total assets" value={<Money value={nw.assets} compact="pref" />} sub={`${CASH_ACCOUNTS.length + HOLDINGS.length + ASSETS.length} items`} />
        <Metric label="Total liabilities" value={<Money value={nw.liabilities} compact="pref" />} sub={`${LOANS.length} loans, ${CARDS.length} cards`} href="/liabilities" />
        <Metric label="Change in 12 months" value={<Money value={nw.netWorth - yearAgo.netWorth} compact="pref" sign="always" tone="gain" />} sub={<Pct value={((nw.netWorth - yearAgo.netWorth) / yearAgo.netWorth) * 100} sign />} />
      </MetricStrip>

      <div className="grid gap-px border-b border-rule bg-rule lg:grid-cols-12 [&>*]:bg-paper">
        <Section className="lg:col-span-7" title="Net worth history" meta="month-end, 24 months" bodyClassName="px-4 pb-5 md:px-6">
          <TrendChart
            height={190}
            label="Net worth by month-end"
            xEvery={3}
            points={hist.map((h) => ({
              label: formatMonth(h.month, "MMM yy"),
              title: formatMonth(h.month, "MMMM yyyy") + (h.month === AS_OF_MONTH ? " (today)" : ""),
              value: h.netWorth,
            }))}
          />
          <p className="mt-3 text-xs text-ink-3">The step in April 2025 is the apartment&rsquo;s revaluation; the dip in early 2025 is the market correction.</p>
        </Section>
        <Section className="lg:col-span-5" title="How quickly you could use it" meta="assets by liquidity" bodyClassName="px-4 pb-5 md:px-6">
          <SegmentBar
            variant="tall"
            label="Assets by liquidity"
            segments={ladder.map((l) => ({ key: l.key, label: l.key, value: assets.filter((a) => a.liquidity === l.key).reduce((s, a) => s + a.value, 0), color: l.color }))}
          />
          <ul className="mt-4 space-y-1.5 text-sm">
            {ladder.map((l) => {
              const v = assets.filter((a) => a.liquidity === l.key).reduce((s, a) => s + a.value, 0);
              return (
                <li key={l.key} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-2">
                    <span className="font-medium text-ink">{l.key}</span> ·{" "}
                    {l.key === "Available now"
                      ? "savings and cash"
                      : l.key === "Days to sell"
                        ? "deposits, funds, shares"
                        : l.key === "Locked"
                          ? "EPF, PPF, NPS"
                          : "home, plot, car, jewellery"}
                  </span>
                  <Money value={v} compact className="num shrink-0" />
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      <Section title="Balance sheet" meta="click a group to see what's in it" className="border-b border-rule">
        <TableWrap>
          <table className="tbl min-w-[560px]">
            <thead>
              <tr>
                <th>Assets</th>
                <th className="hidden w-[150px] sm:table-cell">Liquidity</th>
                <th className="r w-[80px]">Share</th>
                <th className="r hidden w-[150px] md:table-cell">{`Since ${formatMonth(prev.month, "MMMM")}`}</th>
                <th className="r w-[140px]">Value</th>
              </tr>
            </thead>
            <tbody>{renderGroup(assets, "asset")}</tbody>
            <tbody>
              <tr>
                <td className="font-semibold">Total assets</td>
                <td className="hidden sm:table-cell" />
                <td />
                <td className="hidden md:table-cell" />
                <td className="r num font-semibold">
                  <Money value={nw.assets} />
                </td>
              </tr>
              <tr>
                <th colSpan={5} className="static! pt-5">
                  Liabilities
                </th>
              </tr>
            </tbody>
            <tbody>{renderGroup(liabilities, "liability")}</tbody>
            <tbody>
              <tr>
                <td className="font-semibold">Total liabilities</td>
                <td className="hidden sm:table-cell" />
                <td />
                <td className="hidden md:table-cell" />
                <td className="r num font-semibold">
                  <Money value={-nw.liabilities} />
                </td>
              </tr>
              <tr className="bg-paper-2">
                <td className="text-base font-[650]">Net worth</td>
                <td className="hidden sm:table-cell" />
                <td />
                <td className="r hidden md:table-cell">
                  <Delta value={nw.netWorth - prev.netWorth} compact className="justify-end text-xs" />
                </td>
                <td className="r num text-base font-[650]">
                  <Money value={nw.netWorth} />
                </td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p className="px-4 py-3 text-xs text-ink-3 md:px-6">
          Each item is counted once: gold bonds and the gold ETF sit in investments, jewellery under physical gold; the apartment is counted at its full value and its home loan as a liability.
        </p>
      </Section>

      <Section
        title="Composition over time"
        meta="assets stacked by type, beside liabilities"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? <BarChart3 size={13} aria-hidden /> : <Table2 size={13} aria-hidden />}
            {asTable ? "View as chart" : "View as table"}
          </button>
        }
        bodyClassName="px-4 pb-6 md:px-6"
      >
        {asTable ? (
          <TableWrap>
            <table className="tbl min-w-[860px]">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="r">Cash</th>
                  <th className="r">Investments</th>
                  <th className="r">Retirement</th>
                  <th className="r">Real estate</th>
                  <th className="r">Vehicles</th>
                  <th className="r">Gold</th>
                  <th className="r">Liabilities</th>
                  <th className="r">Net worth</th>
                </tr>
              </thead>
              <tbody className="num">
                {[...hist].reverse().map((h) => (
                  <tr key={h.month}>
                    <td>{formatMonth(h.month, "MMM yyyy")}</td>
                    {[h.cash, h.investments, h.retirement, h.realEstate, h.vehicles, h.gold].map((v, i) => (
                      <td key={i} className="r">
                        <Money value={v} compact />
                      </td>
                    ))}
                    <td className="r">
                      <Money value={-h.liabilities} compact />
                    </td>
                    <td className="r font-semibold">
                      <Money value={h.netWorth} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <Columns
            label={`Assets by type and liabilities, month-end, ${monthSpanLabel(hist[0].month, hist[hist.length - 1].month)}`}
            height={200}
            data={hist.map((h, i) => ({
              label: i % 3 === (hist.length - 1) % 3 ? formatMonth(h.month, "MMM yy") : "",
              title: formatMonth(h.month, "MMMM yyyy"),
              values: { cash: h.cash, investments: h.investments, realEstate: h.realEstate, gold: h.gold, retirement: h.retirement, vehicles: h.vehicles, liabilities: h.liabilities },
              highlight: h.month === AS_OF_MONTH,
            }))}
            series={[
              { key: "cash", label: "Cash", color: "var(--c1)", stack: "a" },
              { key: "investments", label: "Investments", color: "var(--c2)", stack: "a" },
              { key: "realEstate", label: "Real estate", color: "var(--c3)", stack: "a" },
              { key: "gold", label: "Gold", color: "var(--c4)", stack: "a" },
              { key: "retirement", label: "Retirement", color: "var(--c5)", stack: "a" },
              { key: "vehicles", label: "Vehicles", color: "var(--c6)", stack: "a" },
              { key: "liabilities", label: "Liabilities", color: "var(--c-neutral)" },
            ]}
          />
        )}
      </Section>
    </div>
  );
}

