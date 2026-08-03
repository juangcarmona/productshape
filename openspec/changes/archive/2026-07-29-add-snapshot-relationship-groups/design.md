# Design: add-snapshot-relationship-groups

## Context

`SLI-SNAPSHOT-003` established the inert data region, the fragment router and the artifact detail, and rendered relationships as two flat lists — `Declares (references)` and `Referenced by (derived)` — each entry carrying an arrow, the relationship type and a link. That was a deliberate carry-forward, not a design: it regressed nothing while the foundation landed.

The data needed is already present. Each edge in the embedded region has `from`, `to` and `kind`, and every artifact carries its own `kind`, so `(direction, relationship type, other-end kind)` is computable in the browser with no change to generation.

## Goals / Non-Goals

**Goals**

- Group within each direction by relationship type and by the kind at the other end, with exact counts.
- Collapse groups that would overwhelm the view; expand on reader action, keyboard-operable, state exposed.
- Keep the complete list of typed, directed relationships readable without any visualization.
- Do not regress artifact-selection latency against the budget agreed in `SLI-SNAPSHOT-003`.

**Non-Goals**

- Any visual projection. The focused neighbourhood drawing is `SLI-SNAPSHOT-006`, which is required to have the list this slice delivers as its equivalent.
- Ranked search (`SLI-SNAPSHOT-005`).
- Multi-hop expansion. One hop is the product decision; deeper reachability belongs to impact analysis.
- Any change to which relationships exist or how they are derived.

## Decisions

### D1 — Group by (direction, relationship type, other-end kind), in that order

Direction is the outermost split because it is the distinction the methodology cares about most: what an artifact declares versus what the model derives about it. Relationship type comes next because it carries the semantics a reader is usually following — `governed-by` and `uses-terms` are different questions. Kind is innermost because within one relationship type the kind at the other end is often constant, so it collapses to a single group and costs nothing; where it varies, it separates meaningfully.

Ordering within a group follows the graph's existing edge sort, so it is deterministic without extra work.

### D2 — Collapse above eight members, expanded below

Groups of eight or fewer render expanded; larger ones render collapsed with their count. Eight is chosen because it is about what fits in a glance without scrolling in the detail pane at the compact density `QR-PRESENTATION-001` requires, and because in this repository's model it leaves almost every group open while collapsing exactly the ones that spill — `BC-PRODUCT-DEFINITION`'s incoming `bounded-context` group of 16, for instance.

The threshold is a presentation constant, not a product rule: `FR-SNAPSHOT-005` says "large enough to overwhelm the projection", and the product deliberately does not fix a number. Recorded here so it is a decision rather than an accident.

### D3 — `<details>`/`<summary>`, not a scripted disclosure widget

Collapsing uses the platform's own disclosure element. It is keyboard-operable, announces expanded state without an ARIA attribute to maintain, works with no script at all, and needs no focus management of our own. A hand-rolled button-plus-`aria-expanded` would be more code for less correctness.

`<summary>` carries the group label and the exact count, so the count is visible while collapsed — which is the honesty requirement: the reader knows precisely what they are choosing not to look at.

### D4 — Collapsed groups render no members at all

A collapsed group inserts a summary row and nothing else; members are built when it first opens. This is the same packaging-versus-presentation reasoning as the slice before: `BC-C-001` at 10× has 171 relationships, and rendering all of them to immediately hide 163 would pay the full cost for no benefit. It is also why this slice should make high-degree selection faster rather than slower.

### D5 — The list stays the substance, in the detail, not behind a control

The grouped list lives in the artifact detail where the previous flat lists were. It is not a panel a reader opens. `FR-SNAPSHOT-005` requires the non-visual equivalent to be _always available_; putting it behind a disclosure of its own would make the substance conditional on finding a control.

## Risks / Trade-offs

- **Deeper nesting.** Two grouping levels inside two directions can read as bureaucracy on an artifact with few relationships. Mitigated by rendering a group's members directly when a direction has only one group, so simple artifacts look simple.
- **The threshold is a judgement.** Eight will be wrong for some models. It is one constant in one place, and the product's own wording leaves it to design; if it proves wrong the fix is local.
- **`<details>` styling.** The default marker needs restraining to match the presentation system; a browser that renders it unusually is a cosmetic risk, not a functional one.

## Migration Plan

None. The generated file is disposable and regenerated by `prodshape graph --format html`; no data, no configuration and no CLI surface changes. A reader who knew the flat lists finds the same relationships grouped.

## Open Questions

None for this slice. `CHG-SNAPSHOT-002` carries one open question — the interaction form of the focused neighbourhood — which belongs to `SLI-SNAPSHOT-006` and must be resolved before that slice is approved. It does not block this one: this slice delivers the textual substance, and the question is about the drawing.
