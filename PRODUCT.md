# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One individual managing their own complete financial life. The demonstration persona is a mid-30s salaried technology professional in Bengaluru (~₹42L/yr CTC) with a home loan, a car loan, two credit cards, mutual funds and SIPs, direct equity, EPF/PPF/NPS, gold, insurance policies, and a small side income. They check their finances frequently (daily glances on a laptop or monitor during the workday, plus a longer weekend review), and want direct access to detail rather than a simplified summary.

Single-person workspace. Joint/household ownership is out of scope for Phase 1 but should not be structurally precluded.

## Product Purpose

Arthashala is a personal financial operating system: one connected workstation where the user understands their complete financial position (cash, assets, liabilities, net worth), monitors commitments (EMIs, card dues, bills, premiums, SIPs), manages spending against budgets, tracks investments and goals, and sees what needs attention next.

Success: on opening the app, the user can answer within seconds "Where do I stand?", "What changed?", and "What needs my attention?", then drill into any figure to the records behind it without losing their place.

## Positioning

Not an expense tracker, budgeting app, or investment dashboard alone: every domain of personal finance in one connected cockpit, where every aggregate is inspectable down to its underlying accounts, holdings, loans, and transactions. India-first in terminology and conventions. A personal finance workstation, explicitly not a trading terminal.

## Operating Context

- Desktop-first (common laptop and desktop resolutions), with responsive mobile layouts.
- Primary use is daytime desk checks; light theme is primary, dark theme available.
- Power-user patterns expected: global search, command palette, keyboard shortcuts, fast table filtering/sorting, date-range selection, contextual inspectors and drawers.
- Craft reference cited by the brief: Koyfin and professional portfolio/analytics workstations (density, workspace architecture, compact tables, contextual inspection). Reference sets the craft bar, not the visual world.

## Capabilities and Constraints

- Phase 1 is UI only: Next.js 16 (App Router, Cache Components, Partial Prefetching, React Compiler), React 19, TypeScript, Tailwind CSS 4. Minimal dependencies.
- All data is coherent, typed, interconnected mock data with a single as-of date; predetermined aggregates and schedules, no calculation engines.
- Frontend-only interactions with ephemeral client state (add/edit forms, filters, toggles). No persistence, auth, backend APIs, integrations, live market data, tax logic, forecasting, or AI advice.
- India-first: INR (₹), lakh/crore formatting, Indian financial year (Apr–Mar), Indian banks, EMIs, MFs/SIPs, EPF/PPF/NPS, Indian insurance products. Structure should allow other currencies and account types later.
- No double-counting between net worth components; one record per real-world entity, referenced across modules.

## Brand Commitments

- Product name: **Arthashala** (confirmed by the user).
- Voice: plain, precise, financial vocabulary the user already uses; no hype, no gamification.

## Evidence on Hand

No real user data, customers, testimonials, or partner relationships exist. All figures are synthetic demonstration data and must be labelled as such in the UI. Bank, fund, and insurer names are used only as realistic account labels, never as implied partnerships or integrations.

## Product Principles

1. Clarity over decoration: every element earns its place through information, navigation, or action.
2. Control over automation: every figure can be inspected down to its source records.
3. Depth without complexity: dense, sophisticated information that an ordinary user can still read.
4. Speed over ceremony: moving between related records is immediate and preserves context.
5. Consistency over novelty: one interaction model and one visual vocabulary across every module.

## Accessibility & Inclusion

Accessible contrast in both themes, visible keyboard focus, full keyboard operation of navigation, tables, palette, and inspectors, reduced-motion respected. Financial meaning is never carried by color alone (signs, labels, and icons accompany color).
