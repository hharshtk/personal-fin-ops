"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { BriefcaseBusiness, ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
import { AS_OF } from "@/lib/data";
import { equityEventLabels, equityPosition, equitySymbol, equityTotal, equityUnits, nativeMoney, type EquityEvent } from "@/lib/employee-equity";
import { formatDate } from "@/lib/format";
import type { EquityMarket } from "@/lib/types";
import { useEmployeeEquity, useUI } from "@/components/workspace/state";
import { Money } from "@/components/ui/money";
import { DateMark, EmptyState, Metric, MetricStrip, PageHeader, Section, Tag } from "@/components/ui/primitives";
import { SortTh, TableWrap, useSort } from "@/components/ui/table";

const views = [
  { id: "all", label: "All plans" },
  { id: "esop", label: "ESOP" },
  { id: "espp", label: "ESPP" },
] as const;

type PlanView = (typeof views)[number]["id"];
const shownEventCount = 6;

function totalNote(total: ReturnType<typeof equityTotal>, label: string) {
  if (!total.missing) return label;
  const missing = `${total.missing} ${total.missing === 1 ? "plan" : "plans"} missing inputs`;
  return total.value === undefined ? missing : `Partial total · ${missing}`;
}

export function EmployeeEquityView() {
  const { plans, inputs } = useEmployeeEquity();
  const { inspect, inspector } = useUI();
  const [view, setView] = useState<PlanView>("all");
  const [employer, setEmployer] = useState("");
  const [market, setMarket] = useState<EquityMarket | "">("");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  const positions = plans.map((plan) => equityPosition(plan, inputs, AS_OF));
  const events = positions.flatMap((row) => row.events).sort((a, b) => a.date.localeCompare(b.date));
  const holdings = equityTotal(positions.map((row) => row.holdingsInr));
  const pending = equityTotal(positions.map((row) => row.pendingInr));
  const employers = [...new Set(plans.map((plan) => plan.employer))].sort((a, b) => a.localeCompare(b));
  const rows = positions.filter(({ plan }) => (view === "all" || plan.kind === view)
    && (!employer || employer === plan.employer) && (!market || market === plan.market));
  const filteredEvents = events.filter((event) => rows.some((row) => row.plan.id === event.plan.id));
  const { sorted, sort, toggle } = useSort(rows, {
    employer: ({ plan }) => plan.employer,
    type: ({ plan }) => plan.kind,
    currency: ({ plan }) => plan.currency,
    held: (r) => r.held,
    exercisable: (r) => r.exercisable,
    event: (r) => r.events[0]?.date ?? "\uffff",
  }, { key: "event", dir: "asc" });

  const selectPlan = (id: string) => inspect({ kind: "equity-plan", id });
  const selected = inspector && ["equity-plan", "edit-equity-plan", "equity-activity"].includes(inspector.kind) ? inspector.id : undefined;
  const nextEvent = (kind: EquityEvent["kind"]) => events.find((event) => event.kind === kind);
  const addPlan = () => inspect({ kind: "new-equity-plan", id: view === "espp" ? "espp" : "esop" });

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = event.key === "Home" ? 0
      : event.key === "End" ? views.length - 1
      : event.key === "ArrowLeft" ? (index + views.length - 1) % views.length
      : event.key === "ArrowRight" ? (index + 1) % views.length : undefined;
    if (target === undefined) return;
    event.preventDefault();
    setView(views[target].id);
    tabs.current?.querySelectorAll("button")[target]?.focus();
  }

  return (
    <div className="@container">
      <PageHeader
        title="Employee equity"
        meta={`ESOP grants and ESPP offerings · Demo data as of ${formatDate(AS_OF)} · Edits last until reload`}
        actions={
          <>
            <button type="button" className="btn" onClick={() => inspect({ kind: "equity-inputs", id: "market" })}>
              <SlidersHorizontal size={15} aria-hidden /> Prices &amp; FX
            </button>
            <button type="button" className="btn btn-primary" onClick={addPlan}><Plus size={16} aria-hidden /> Add plan</button>
          </>
        }
      />

      <MetricStrip className="mt-4 md:grid-flow-row md:grid-cols-2 @xl:grid-cols-3 @3xl:grid-flow-col @3xl:grid-cols-none">
        <Metric label="Shares held" size="lg"
          value={holdings.value === undefined ? <span className="text-xl">Unavailable</span> : <Money value={holdings.value} compact="pref" />}
          sub={totalNote(holdings, "INR market value across plans")}
        />
        <Metric label="Uninvested ESPP" value={pending.value === undefined ? <span className="text-xl">Unavailable</span> : <Money value={pending.value} compact="pref" />}
          sub={totalNote(pending, "Pending contributions in INR")}
        />
        {([
          ["vest", "Next vesting"],
          ["expiry", "Next exercise expiry"],
          ["purchase", "Next purchase"],
        ] as const).map(([kind, label]) => {
          const event = nextEvent(kind);
          return <Metric key={kind} label={label} value={event ? formatDate(event.date) : "—"} sub={event?.plan.employer ?? "None scheduled"}
            className={kind === "purchase" ? "col-span-2 @3xl:col-span-1" : undefined} onClick={event ? () => selectPlan(event.plan.id) : undefined} />;
        })}
      </MetricStrip>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pt-3 pb-1 md:px-6">
        <div ref={tabs} className="tabs" role="tablist" aria-label="Plan type">
          {views.map(({ id, label }, index) => (
            <button key={id} id={`equity-tab-${id}`} type="button" role="tab" className="tab" aria-controls="equity-plans"
              aria-selected={view === id} tabIndex={view === id ? 0 : -1} onClick={() => setView(id)} onKeyDown={(event) => moveTab(event, index)}>
              {label}<span className="ml-1.5 text-xs text-ink-3">{id === "all" ? plans.length : plans.filter((plan) => plan.kind === id).length}</span>
            </button>
          ))}
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 @xl:w-auto @xl:grid-cols-[minmax(8rem,12rem)_minmax(8rem,auto)]">
          <select className="select max-w-full" aria-label="Filter by employer" value={employer} onChange={(event) => setEmployer(event.target.value)}>
            <option value="">All employers</option>
            {employer && !employers.includes(employer) && <option value={employer}>{employer}</option>}
            {employers.map((name) => <option key={name}>{name}</option>)}
          </select>
          <select className="select" aria-label="Filter by stock market" value={market} onChange={(event) => setMarket(event.target.value as EquityMarket | "")}>
            <option value="">All markets</option>
            <option value="indian">Indian stocks</option>
            <option value="foreign">Foreign stocks</option>
          </select>
        </div>
      </div>

      <div id="equity-plans" role="tabpanel" aria-labelledby={`equity-tab-${view}`} className="border-b border-rule">
        {rows.length ? (
          <TableWrap label="Scrollable employee equity plans">
            <table className="tbl min-w-[740px]" aria-label="Employee equity plans">
              <thead>
                <tr>
                  <SortTh k="employer" sort={sort} onSort={toggle}>Employer / plan</SortTh>
                  <SortTh k="held" sort={sort} onSort={toggle} align="right">Shares held</SortTh>
                  <SortTh k="type" sort={sort} onSort={toggle}>Type</SortTh>
                  <SortTh k="currency" sort={sort} onSort={toggle}>Currency</SortTh>
                  <SortTh k="exercisable" sort={sort} onSort={toggle} align="right">Exercisable</SortTh>
                  <th className="r">Uninvested</th>
                  <SortTh k="event" sort={sort} onSort={toggle}>Next event</SortTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ plan, held, exercisable, pending, pendingInr, holdingsInr, events: planEvents }) => {
                  const event = planEvents[0];
                  return (
                    <tr key={plan.id} className="group" data-clickable="true" aria-selected={selected === plan.id} onClick={(event) => {
                      event.currentTarget.querySelector("button")?.focus({ preventScroll: true });
                      selectPlan(plan.id);
                    }}>
                      <td>
                        <button type="button" className="block text-left font-medium hover:text-pen hover:underline"
                          aria-label={`Open ${plan.employer} ${plan.name}`}
                          onClick={(e) => { e.stopPropagation(); selectPlan(plan.id); }}>
                          {plan.employer}
                        </button>
                        <div className="text-xs text-ink-3 group-aria-selected:text-ink-2">{[plan.name, equitySymbol(plan)].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="r num">
                        <div className="font-semibold">{equityUnits(held)}</div>
                        {held > 0 && <div className="text-xs text-ink-3 group-aria-selected:text-ink-2">{holdingsInr === undefined ? "Value unavailable" : <Money value={holdingsInr} />}</div>}
                      </td>
                      <td><Tag>{plan.kind.toUpperCase()}</Tag></td>
                      <td className="num text-ink-2">{plan.currency}</td>
                      <td className="r num">{plan.kind === "esop" ? equityUnits(exercisable) : "—"}</td>
                      <td className="r num">
                        {plan.kind === "espp" ? nativeMoney(pending, plan.currency) : "—"}
                        {pendingInr === undefined && <div className="text-xs text-ink-3 group-aria-selected:text-ink-2">INR unavailable</div>}
                      </td>
                      <td>
                        {event ? (
                          <>
                            <span className="num whitespace-nowrap">{formatDate(event.date)}</span>
                            <div className="text-xs text-ink-3 group-aria-selected:text-ink-2">{equityEventLabels[event.kind]}</div>
                          </>
                        ) : <span className="text-ink-3 group-aria-selected:text-ink-2">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState icon={BriefcaseBusiness} title="No matching plans" body="Change your filters or add an ESOP grant or ESPP offering."
            action={<button type="button" className="btn" onClick={() => { setEmployer(""); setMarket(""); setView("all"); }}>Clear filters</button>} />
        )}
      </div>

      <Section id="equity-upcoming" title="Upcoming events" meta={`${filteredEvents.length} scheduled`}
        actions={filteredEvents.length > shownEventCount && (
          <button type="button" className="btn btn-ghost btn-sm" aria-controls="equity-events" aria-expanded={showAllEvents} onClick={() => setShowAllEvents(!showAllEvents)}>
            {showAllEvents ? "Show fewer" : "Show all events"}
          </button>
        )}>
        {filteredEvents.length ? (
          <ul id="equity-events">
            {(showAllEvents ? filteredEvents : filteredEvents.slice(0, shownEventCount)).map((event) => (
              <li key={`${event.plan.id}-${event.kind}-${event.id}`} className="border-t border-rule">
                <button type="button" className="flex min-h-(--row-h) w-full items-center gap-3 px-4 py-(--row-pad) text-left hover:bg-paper-2 md:px-5" onClick={() => selectPlan(event.plan.id)}>
                  <time dateTime={event.date} className="w-[70px] shrink-0 num">
                    <DateMark date={event.date} /> <span className="text-xs text-ink-3">{event.date.slice(0, 4)}</span>
                  </time>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{equityEventLabels[event.kind]} · {event.plan.employer}</span>
                    <span className="block text-xs text-ink-3">{event.plan.name}{event.options !== undefined && ` · ${equityUnits(event.options)} options`}</span>
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="border-t border-rule px-4 py-4 text-sm text-ink-3 md:px-5">No upcoming events for these plans.</p>}
      </Section>
    </div>
  );
}
