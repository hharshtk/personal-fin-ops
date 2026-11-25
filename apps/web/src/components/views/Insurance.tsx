"use client";

import { AS_OF, POLICIES, getAsset } from "@myfinancespace/core/data";
import { diffDays, formatDate, relativeDays } from "@myfinancespace/core/format";
import { useUI } from "@/components/workspace/state";
import { Money } from "@/components/ui/money";
import { DateMark, Metric, MetricStrip, PageHeader, Section, Tag } from "@/components/ui/primitives";
import { TableWrap } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";

const TYPE: Record<string, string> = {
  health: "Health",
  parents_health: "Health · parents",
  group_health: "Health · employer",
  term: "Term life",
  vehicle: "Motor",
  home: "Home",
};

export function InsuranceView() {
  const { inspect, inspector } = useUI();
  const policies = [...POLICIES].sort((a, b) => (a.renewsOn < b.renewsOn ? -1 : 1));
  const life = POLICIES.filter((p) => p.kind === "term").reduce((s, p) => s + p.cover, 0);
  const healthSelf = POLICIES.filter((p) => p.kind === "health" || p.kind === "group_health").reduce((s, p) => s + p.cover, 0);
  const premiums = POLICIES.reduce((s, p) => s + p.premium, 0);
  const next = policies.find((p) => p.renewsOn >= AS_OF)!;
  const selected = inspector?.kind === "policy" ? inspector.id : null;

  const coverage = [
    { label: "Life", have: life, note: "About 4.8× your annual CTC. It would clear the home loan and leave roughly ₹1.4 Cr." },
    { label: "Your health", have: healthSelf, note: "₹15 L personal plus ₹5 L through work. The work cover ends if you change jobs." },
    { label: "Parents' health", have: 1000000, note: "₹10 L with 30% co-pay. A large claim would still cost you ₹3 L." },
    { label: "Home & contents", have: 6000000, note: "Structure ₹50 L, contents ₹10 L. Rebuild cost in Whitefield is about ₹48 L." },
    { label: "Car", have: 1140000, note: "Zero-depreciation add-on. Renews in 20 days; the no-claim bonus is 20%." },
  ];

  return (
    <div>
      <PageHeader title="Insurance" meta="Policies, cover and renewal dates" />
      <MetricStrip className="mt-4">
        <Metric label="Life cover" value={<Money value={life} compact="pref" />} sub="1 term policy" size="lg" />
        <Metric label="Your health cover" value={<Money value={healthSelf} compact="pref" />} sub="Personal plus employer" />
        <Metric label="Premiums a year" value={<Money value={premiums} />} sub={<>about <Money value={premiums / 12} /> a month</>} />
        <Metric label="Next renewal" value={formatDate(next.renewsOn, "d MMM")} sub={`${next.insurer} · ${relativeDays(next.renewsOn, AS_OF)}`} onClick={() => inspect({ kind: "policy", id: next.id })} />
      </MetricStrip>

      <Section title="Policies" meta="by renewal date">
        <TableWrap>
          <table className="tbl min-w-[880px]">
            <thead>
              <tr>
                <th>Policy</th>
                <th className="w-[150px]">Type</th>
                <th className="w-[220px]">Covers</th>
                <th className="r w-[120px]">Cover</th>
                <th className="r w-[110px]">Premium</th>
                <th className="w-[150px]">Renews</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const days = diffDays(p.renewsOn, AS_OF);
                return (
                  <tr key={p.id} data-clickable="true" aria-selected={selected === p.id} onClick={() => inspect({ kind: "policy", id: p.id })}>
                    <td>
                      <div className="font-medium text-ink">{p.name}</div>
                      <div className="text-xs text-ink-3">
                        {p.insurer} · {p.policyNo}
                      </div>
                    </td>
                    <td className="text-ink-2">{TYPE[p.kind]}</td>
                    <td className="max-w-0 truncate text-ink-2">{p.assetId ? getAsset(p.assetId)?.name : p.insured}</td>
                    <td className="r num font-semibold">
                      <Money value={p.cover} compact />
                    </td>
                    <td className="r num text-ink-2">{p.premium ? <Money value={p.premium} /> : <Tag>Employer</Tag>}</td>
                    <td>
                      <DateMark date={p.renewsOn} tone={days <= 30 ? "due" : "default"} /> <span className="text-xs text-ink-3">{p.renewsOn.slice(0, 4)}</span>
                      <div className={cx("text-xs", days <= 30 ? "font-semibold text-red" : "text-ink-3")}>{relativeDays(p.renewsOn, AS_OF)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title="What you're covered for" className="border-t border-rule" bodyClassName="px-4 pb-6 md:px-6">
        <dl className="grid gap-x-10 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          {coverage.map((c) => (
            <div key={c.label} className="border-t border-rule pt-3">
              <dt className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink">{c.label}</span>
                <Money value={c.have} compact className="figure text-lg" />
              </dt>
              <dd className="mt-1 text-sm text-ink-2">{c.note}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs text-ink-3">These notes describe the demonstration policies; they are not insurance advice.</p>
      </Section>
    </div>
  );
}
