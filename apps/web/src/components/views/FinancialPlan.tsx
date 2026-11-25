"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  FileText,
  HandCoins,
  Landmark,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Money } from "@/components/ui/money";
import { DateMark, InspectButton, PageHeader, Progress, Section, Tag } from "@/components/ui/primitives";
import { AS_OF, goalProgress } from "@myfinancespace/core/data";
import { formatDate, fyLabel } from "@myfinancespace/core/format";
import type { ISODate } from "@myfinancespace/core/types";

type PlanArea = {
  id: string;
  title: string;
  icon: LucideIcon;
  summary: ReactNode;
  status: string;
  tone?: "amber" | "green";
  progress?: number;
  description: string;
  records: { name: string; detail?: string; value: ReactNode }[];
  sources: ReactNode;
  review?: { date: ISODate; task: string };
};

const emergency = goalProgress("g-emergency");
const retirement = goalProgress("g-retire");
const receivables = [
  { name: "Lumen Labs invoice #019", date: "2026-12-02", amount: 14750 },
  { name: "Work travel reimbursement", date: "2026-12-07", amount: 6250 },
];

const sourceClass = "inline-flex min-h-8 items-center rounded-sm text-sm font-medium text-pen underline-offset-4 hover:underline";

const areas: PlanArea[] = [
  {
    id: "tax-records",
    title: "Taxes & filing",
    icon: FileText,
    summary: fyLabel(AS_OF),
    status: "2 records to collect",
    tone: "amber",
    description: "Gather records for your salary, consulting income and investments in one checklist.",
    records: [
      { name: "Salary slips", value: "On hand through November" },
      { name: "Consulting TDS certificate", value: "To collect" },
      { name: "Broker capital gains statement", value: "To collect" },
    ],
    sources: <>
      <Link className={sourceClass} href="/transactions?category=freelance&period=all">Consulting transactions</Link>
      <Link className={sourceClass} href="/reports">Reports</Link>
    </>,
    review: { date: "2026-11-27", task: "Review tax records" },
  },
  {
    id: "receivables",
    title: "Money owed to you",
    icon: HandCoins,
    summary: <Money value={receivables.reduce((total, record) => total + record.amount, 0)} className="num" />,
    status: "2 payments pending",
    description: "Track expected payments separately from cash already received.",
    records: receivables.map(({ name, date, amount }) => ({
      name,
      detail: `Expected ${formatDate(date, "d MMM yyyy")}`,
      value: <Money value={amount} className="num" />,
    })),
    sources: <Link className={sourceClass} href="/transactions?category=freelance&period=all">Received consulting payments</Link>,
    review: { date: receivables[0].date, task: "Check consulting payment" },
  },
  {
    id: "emergency-fund",
    title: "Emergency fund",
    icon: ShieldCheck,
    summary: <><Money value={emergency.saved} compact="pref" className="num" /> set aside</>,
    status: "Below target",
    tone: "amber",
    progress: emergency.ratio,
    description: "The savings account and fixed deposit allocated to your emergency goal.",
    records: [
      { name: "Goal target", value: <Money value={emergency.goal.target} className="num" /> },
      { name: "Still to set aside", value: <Money value={emergency.gap} className="num" /> },
      { name: "Target date", value: formatDate(emergency.goal.targetDate) },
    ],
    sources: <>
      <InspectButton className={sourceClass} target={{ kind: "goal", id: emergency.goal.id }}>Emergency fund goal</InspectButton>
      <Link className={sourceClass} href="/accounts/hdfc-fd">Reserve fixed deposit</Link>
      <Link className={sourceClass} href="/budget">Budget & cash flow</Link>
    </>,
    review: { date: "2026-12-03", task: "Review emergency reserve deposit" },
  },
  {
    id: "retirement",
    title: "Retirement",
    icon: Landmark,
    summary: <><Money value={retirement.saved} compact="pref" className="num" /> allocated</>,
    status: "On plan",
    tone: "green",
    progress: retirement.ratio,
    description: "Your retirement goal brings together EPF, PPF, NPS and earmarked mutual funds.",
    records: [
      { name: "Target in today’s money", value: <Money value={retirement.goal.target} className="num" /> },
      { name: "Planned each month", value: <Money value={retirement.goal.monthlyPlan} className="num" /> },
      { name: "Target date", value: formatDate(retirement.goal.targetDate) },
    ],
    sources: <>
      <InspectButton className={sourceClass} target={{ kind: "goal", id: retirement.goal.id }}>Retirement goal</InspectButton>
      <Link className={sourceClass} href="/investments">Investment holdings</Link>
    </>,
  },
  {
    id: "pay-benefits",
    title: "Pay & benefits",
    icon: BriefcaseBusiness,
    summary: "Salary, EPF and equity",
    status: "1 statement to review",
    tone: "amber",
    description: "See salary deposits alongside benefits that appear on your payslip or in separate accounts.",
    records: [
      { name: "November payslip", value: "On hand" },
      { name: "Employer EPF contribution", value: "Review payroll statement" },
      { name: "Employee stock plans", value: "See equity schedule" },
    ],
    sources: <>
      <Link className={sourceClass} href="/transactions?category=salary&period=all">Salary transactions</Link>
      <InspectButton className={sourceClass} target={{ kind: "holding", id: "epf" }}>EPF holding</InspectButton>
      <Link className={sourceClass} href="/employee-equity">Employee equity</Link>
    </>,
  },
  {
    id: "estate",
    title: "Estate & nominees",
    icon: Wallet,
    summary: "Bank, insurance and will records",
    status: "2 items to review",
    tone: "amber",
    description: "Keep track of where key documents are held and which nominations need a review.",
    records: [
      { name: "Salary account nominee", value: "Recorded" },
      { name: "Term life nominee", value: "Verify with insurer" },
      { name: "Will and document location", value: "To record" },
    ],
    sources: <>
      <Link className={sourceClass} href="/accounts/hdfc-sb">Salary account</Link>
      <InspectButton className={sourceClass} target={{ kind: "policy", id: "term" }}>Term life policy</InspectButton>
    </>,
  },
];

const reviews = areas
  .flatMap(({ id, review }) => review ? [{ id, ...review }] : [])
  .sort((a, b) => a.date.localeCompare(b.date));

function openArea(id: string) {
  const area = document.getElementById(id);
  if (!(area instanceof HTMLDetailsElement)) return;
  area.open = true;
  const summary = area.querySelector("summary");
  summary?.focus({ preventScroll: true });
  summary?.scrollIntoView({ block: "nearest" });
}

function PlanningArea({ area, initiallyOpen }: { area: PlanArea; initiallyOpen: boolean }) {
  const Icon = area.icon;

  return (
    <details id={area.id} name="financial-plan-areas" open={initiallyOpen || undefined} className="group border-b border-rule">
      <summary className="grid min-h-12 cursor-pointer scroll-mt-14 list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 hover:bg-paper-2 focus-visible:outline-offset-[-2px] group-open:bg-paper-2 md:px-6 @3xl:grid-cols-[auto_minmax(0,1fr)_9.75rem_auto] [&::-webkit-details-marker]:hidden">
        <Icon size={17} className="text-ink-3 group-open:text-pen" aria-hidden />
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5">
          <span className="min-w-38 text-base font-semibold text-ink">{area.title}</span>
          <span className="text-sm text-ink-3">{area.summary}</span>
        </span>
        <Tag tone={area.tone} className="col-start-2 row-start-2 mt-1 w-fit @3xl:col-start-3 @3xl:row-start-1 @3xl:mt-0">{area.status}</Tag>
        <ChevronDown size={16} className="col-start-3 row-start-1 text-ink-3 group-open:rotate-180 @3xl:col-start-4" aria-hidden />
      </summary>
      <div className="border-t border-rule px-4 pt-3 pb-2 md:px-6">
        <p className="max-w-[65ch] text-sm text-ink-2">{area.description}</p>
        {area.progress !== undefined && (
          <div className="mt-3 flex items-center gap-3">
            <Progress className="max-w-52 flex-1" value={area.progress} />
            <span className="num text-xs text-ink-3">{Math.round(area.progress * 100)}% of target</span>
          </div>
        )}
        <dl className="mt-2 divide-y divide-rule text-sm">
          {area.records.map(({ name, detail, value }) => (
            <div key={name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
              <dt className="text-ink">
                {name}
                {detail && <span className="mt-0.5 block text-xs text-ink-3">{detail}</span>}
              </dt>
              <dd className="text-ink-2">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-1 flex flex-wrap gap-x-4 border-t border-rule pt-1">{area.sources}</div>
      </div>
    </details>
  );
}

export function FinancialPlan() {
  return (
    <div className="@container">
      <PageHeader
        title="Financial plan"
        meta="Track money you’re expecting, reserves you’re building, and records you need to keep current."
        actions={<p className="text-xs text-ink-3">Demonstration data as of {formatDate(AS_OF)}</p>}
      />
      <div className="mt-4 grid border-t border-rule @4xl:grid-cols-[minmax(0,1fr)_16rem] @6xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Section id="planning-areas" title="Planning areas" className="@4xl:border-r @4xl:border-rule">
          <div className="border-t border-rule">
            {areas.map((area, index) => <PlanningArea key={area.id} area={area} initiallyOpen={index === 0} />)}
          </div>
        </Section>
        <Section id="planning-reviews" title="Upcoming reviews" className="pb-2">
          <ol className="border-y border-rule">
            {reviews.map(({ id, date, task }) => (
              <li key={id} className="border-b border-rule last:border-b-0">
                <button type="button" onClick={() => openArea(id)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-paper-2 hover:text-pen focus-visible:outline-offset-[-2px] md:px-5">
                  <time dateTime={date} className="w-12 shrink-0"><DateMark date={date} /></time>
                  <span className="flex-1 font-medium">{task}</span>
                  <ChevronRight size={14} className="shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}
