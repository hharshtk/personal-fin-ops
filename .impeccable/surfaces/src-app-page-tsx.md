---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app","src/components"]
---

# Surface brief: Arthashala workspace (cockpit + all financial workspaces)

Scope: the whole Phase 1 app shell and every workspace route; the Overview cockpit (`/`) is the identity-defining first surface.
Visitor mode: Operate.

Audience and job: one salaried professional (see PRODUCT.md) checking their complete financial position daily on a laptop in daylight, plus a weekly review. Job: answer "where do I stand / what changed / what needs attention", then drill from any figure to its records without losing place.
Constraints: UI only, typed coherent mock data, as-of 22 Nov 2026, FY 2026–27, INR lakh/crore. Light theme primary, dark available.

## Direction contract

THESIS: Your money set like the household wall calendar: every commitment, credit and due date lives on a dated sheet you can read at a glance. Refuses the category default of a grey card grid of KPI tiles and decorative charts.

OWN-WORLD: Two-colour calendar print on bright newsprint white: carbon ink for printed facts, calendar red only for money due/overdue/loss, ballpoint-pen blue only for the user's own hand (selection, focus, manual entries, primary actions). The nav rail is a neutral surface that follows the theme (light grey / near-black), per the user's override on 22 Nov 2026. Anek Latin across its width axis: condensed heavy numerals for dates and headline figures, normal width for UI. Hairline rules and type divide regions; no boxed cards, no shadows on content.

STORY: The visitor sees net worth and this month's position, reads November's sheet for what has cleared and what is still due, acts on the attention list, then clicks any figure to inspect its records beside the work.

FIRST VIEWPORT: Neutral rail left (grouped nav, pen-blue mark on the active item). Thin top bar: breadcrumb, search/command (⌘K), as-of chip, Add, attention count. Position strip: net worth (condensed 32px figure, 12-month line), assets vs liabilities, liquid cash, this month in/out/saved. Below: the November month sheet (≈60% width; red due-day numerals, pen-ring today, paid entries stamped) beside "Needs attention" (≈40%). Ledger, budget exceptions and cash flow start at the fold.

FORM: Kalnirnay wall-calendar sheet; candidate 4 of 7 on the ordered list; seed:eae0ecc38a1fa2ce. Signature interaction: click a day on the month sheet to pin it (pen ring) and list its entries; click any entry to open its inspector. Motion grammar: 150–200 ms state transitions only (inspector slide, palette fade); reduced motion snaps.
Raises from declined challengers: paid items stamp, never vanish (ticket wallet) · tabular numerals right-aligned on the rupee (Ikeda datamatics) · no boxed cards, rules and type divide (Metro tiles) · one colour, one job; location re-signs on every screen (airport wayfinding) · inspectors open beside the work, the inspected row stays marked (streaming wall) · every aggregate indexes its components (star atlas).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions
- Multi-currency and household ownership are structurally allowed but not designed.
