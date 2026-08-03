---
id: CHG-SNAPSHOT-004
type: product-change
title: The Product Explorer
status: implemented
base-revision: 'af0d6c64ae9eecbe7628255795ac9b0b45d4745c'
operations:
  add:
    - TERM-PRODUCT-EXPLORER
    - TERM-FOCUSED-TOPOLOGY
    - FR-SNAPSHOT-008
    - FR-SNAPSHOT-009
  modify:
    - JRN-SNAPSHOT-001
    - UC-SNAPSHOT-EXPLORE-001
    - FR-SNAPSHOT-002
    - FR-SNAPSHOT-003
    - FR-SNAPSHOT-005
    - FR-SNAPSHOT-006
    - TERM-GRAPH-PROJECTION
    - TERM-PRODUCT-SNAPSHOT
    - QR-SCALABILITY-001
  remove: []
---

## Problem

Two directions for exploring the product visually have now been rejected on the same premise. The whole-model circle was illegible. The Product Landscape (`CHG-SNAPSHOT-003`, superseded, its implementation removed from the current product) placed every artifact in kind-owned bands — legible, and meaningless: geometry a reader could derive from each identifier. A successor built around a relationship-derived whole-product canvas was drafted and discarded before approval, because it kept the same premise with better decoration: that understanding the product means seeing all of it at once, arranged.

That premise is the defect. It demands global placement rules, global spatial memory, whole-product fit and scale proofs about rendering 730 nodes — machinery no reader's actual question requires. What a product owner, researcher, developer or stakeholder actually does is: understand the aggregate shape, locate an artifact, read it, understand what it touches, and follow one connection at a time. The baseline already serves parts of this well; what it lacks is a coherent definition of the whole experience, and it still promises a layered whole-product map as one of three projections.

## Intended Product Outcome

ProductShape exposes the complete product model through overview, search, catalogues, artifact reading and progressively disclosed relationship projections. **Completeness means that every artifact and canonical relationship is reachable — not that every node is simultaneously rendered.**

The snapshot's exploration experience is the **Product Explorer**: four coordinated surfaces sharing one selection state, one navigation mechanism and one addressable exploration state.

- **Overview** — the entry point: snapshot identity and revision, aggregate counts by type, entry points into every canonical artifact family, the kind-level relationship aggregate, model-health facts only where canonical data already supports them (the no-relationships group), and permanent access to global search. It communicates the aggregate shape; it does not draw every artifact.
- **Catalog** — the primary large-scale discovery mechanism: search by stable ID, title and indexed content; filtering by canonical fields (type, status, bounded context where it exists); deterministic, linkable result sets; browsing by artifact family; opening an artifact while preserving the active query and filters; responsive at the reference corpus scale.
- **Artifact Reader** — the selected artifact dominates: stable identity, type, status, metadata and rendered canonical content; relationships grouped by their actual meaning, direction distinguished where it matters, explicit complete counts on every group, every related artifact one step from becoming the new focus. Deep links, Back/Forward and preserved navigation context make the model navigable as a graph without forcing anyone to interpret a dense node-link diagram.
- **Focused Topology** — a visual relationship projection that is local, bounded and progressive: the selected artifact is the focus; immediate canonical relationships appear grouped by meaning and type; collapsed groups always expose complete counts; the reader deliberately expands or follows; refocusing produces a new projection rather than accumulating the traversal; dense sets fall back to structured lists; everything it shows stays reachable through the Reader, Catalog, search and deep links; it is deterministic for the same model, focus and explicit state; and no visual device invents lifecycle, maturity, importance, sequence, causality or dependency absent from canonical relationships.

There is no persistent whole-product canvas, no simultaneous rendering of every artifact, no whole-product fit, no globally stable positions or global spatial memory, no product-owned bands or universal grouping, no navigation that depends on graph layout, and no indefinite accumulation of expanded nodes. Nothing implies the snapshot is editable.

## Rationale

**Define the experience, not a picture.** Both rejections were rejections of a picture asked to be the experience. The Explorer starts from the reader's operations and assigns each to the surface that answers it best: aggregation answers composition, search and filters answer discovery, prose answers reading, and a bounded local projection answers "what does this touch". Each surface can be excellent at its own job precisely because none is asked to be the whole product.

**Reachability is the completeness claim.** The snapshot's honest promise was always that the file contains everything and everything can be reached — never that everything can be seen at once. Stating that as the central invariant removes the pressure that produced both failures, and makes scalability measurable over what readers do instead of over what a canvas can survive.

**The graph stays first-class without a global drawing.** Relationships remain the methodology's substance: the Reader carries all of them as grouped, counted, directed, navigable text, and the Focused Topology accelerates one neighbourhood at a time. Every traversal survives without the visual, which keeps the product accessible and keeps the projection honest — an accelerator, never a gatekeeper.

**Behaviour, not design.** Every requirement in this change states observable behaviour and invariants. No graph library, layout algorithm, ranking formula, virtualization strategy, rendering framework or component architecture is chosen here; those are technical-design decisions for delivery.

## Affected Product Areas

Found by inspecting the promoted baseline and running impact over the snapshot subgraph; `UC-SNAPSHOT-EXPLORE-001` remains the hub from which the Explorer requirements derive.

**Added:**

- **TERM-PRODUCT-EXPLORER** — names the four-surface experience and carries the central completeness statement.
- **TERM-FOCUSED-TOPOLOGY** — names the local, bounded, progressive projection and its boundaries.
- **FR-SNAPSHOT-008** — the Catalog: discovery at scale with deterministic, linkable, preserved query state.
- **FR-SNAPSHOT-009** — the Focused Topology contract.

**Modified:**

- **FR-SNAPSHOT-002** — becomes the Artifact Reader's contract in full. It already carried the master–detail rule, declared-versus-derived groups, escaping and the narrow-viewport rule; it gains what the Reader owes the Explorer and what the old three-projection requirement previously carried for text: complete counts on every relationship group, large groups collapsed with their complete count, titles and identifiers on every entry, one-step refocus, visible and retraceable navigation context, and the model navigable as a graph through the Reader alone.
- **FR-SNAPSHOT-003** — the orientation view becomes the Overview: entry points into every canonical family, permanent global search, model-health facts bounded to canonical data; its dead cross-reference to a layered view is gone.
- **FR-SNAPSHOT-005** — from "exactly three projections" including a layered whole-product map to exactly two — the kind-level aggregate and the Focused Topology — plus the standing prohibitions: no whole-graph rendering, no persistent whole-product canvas, no global positions, no bands, no layout-dependent navigation.
- **FR-SNAPSHOT-006** — the addressable state grows to cover the Catalog's query-and-filter state and the Focused Topology's explicit disclosure state; the four surfaces are named onto the single selection; navigation-context preservation is stated. The permanent legacy-fragment guarantee and the no-persistence rule are untouched.
- **TERM-GRAPH-PROJECTION** — two projections instead of three; the no-whole-graph reasoning survives.
- **TERM-PRODUCT-SNAPSHOT** — its description of what the file carries follows suit.
- **UC-SNAPSHOT-EXPLORE-001** — the exploration flow becomes the four-surface flow; gains the two new terms.
- **JRN-SNAPSHOT-001** — the narrative walks the Explorer instead of the layered map.
- **QR-SCALABILITY-001** — scalability is redefined over the seven reader operations on the ~730 reference corpus; the recorded baseline measurements and the no-invented-budgets stance are preserved; "render all nodes simultaneously" is no longer a benchmark anywhere.

**Deliberately not modified:**

- **FR-SNAPSHOT-004** — ranked offline search, reused by the Catalog as-is.
- **FR-SNAPSHOT-001**, **QR-DETERMINISM-001** — the generation contract: one self-contained deterministic offline file, honest diagnostics.
- **QR-PRESENTATION-001**, **QR-ACCESSIBILITY-001** — the calm text-first instrument and full keyboard operability already bind every surface, including the two projections, as written.
- **CON-NO-WEB-UI**, **CON-MARKDOWN-001**, **BR-CANONICAL-001**, **BR-RELATIONSHIPS-001**, **BR-IDENTITY-001** — the boundaries this change lives inside: read-only, canonical Markdown, derived relationships, immutable identity. Editing continues through the Product Change workflow, never through the snapshot.

`FR-SNAPSHOT-007` remains unused: it belongs to the superseded `CHG-SNAPSHOT-003` lineage and is never reassigned.

## Open Questions

None outstanding. The product owner set this direction explicitly — the four surfaces, the central completeness statement, the rejected premises and the scalability redefinition — after rejecting two predecessors; this change records that direction as requirements without adding decisions of its own. Technical-design questions (layout, indexing, rendering) are deliberately left to delivery.

## Product Acceptance

The product owner recognizes this change as correctly realized when, on a snapshot generated from any product model:

1. **Overview.** Opening the snapshot orients without rendering any artifact body or artifact-level graph: identity, revision, counts by kind with family entry points, the kind-level aggregate, the generated/read-only statement, and search one gesture away.
2. **Catalog.** Any artifact is locatable by ID, title, content or family browsing; filters use only canonical fields; a query-and-filter state is deterministic and its address reproduces it; opening a result and returning resumes the discovery.
3. **Reader.** The selected artifact dominates: full canonical content, relationships grouped by meaning with direction and complete counts, every related artifact one step from focus; the whole model is navigable as a graph through the Reader alone.
4. **Focused Topology.** The selected artifact anchors a local, bounded, progressive projection: complete counts on everything collapsed, expansion only on deliberate action, refocus replaces rather than accumulates, dense sets fall back to legible lists, and nothing visual invents semantics the canonical relationships lack.
5. **One instrument.** Selection, navigation and exploration state are shared and addressable across all four surfaces; deep links, Back/Forward and legacy bare-identifier fragments behave as FR-SNAPSHOT-006 requires.
6. **The prohibitions hold.** No control anywhere yields a simultaneous rendering of every artifact, a whole-product canvas, whole-product fit, bands, or layout-dependent navigation — at any reference scale.
7. **Reachability is verified as completeness.** Every artifact and every canonical relationship is reached and read through the surfaces, without simultaneous rendering.
8. **The constraints still hold.** One static self-contained offline file; read-only with nothing persisted beyond the address; deterministic output; keyboard-operable and accessible; canonical Markdown remains the only source of truth, evolved only through the Product Change workflow.
9. **Measured, not asserted.** The seven reader operations are measured on the reference corpus on a named environment; existing agreed budgets continue to bind; no new number is asserted without a measurement behind it.

## Delivery Policy

Trunk-based: each approved slice is delivered from a fresh short-lived branch off `main`, one approved slice at a time, with no stack of dependent long-running branches. No partial semantics are promoted before the change is accepted; `prodshape change promote` runs once, for the whole change. No npm release, package bump or changeset while the direction is being validated. Quality obligations — determinism, accessibility, scalability, presentation — apply to every slice that touches them, not to a final hardening pass.

## Out of Scope

- **Editing artifacts**, annotating, approving — anything that would make the snapshot a channel for product knowledge.
- **Comparing revisions or visualising change history.**
- **Displaying proposed changes as if they were current product truth**; the current definition stays separate from proposals.
- **Technical design for the implementation** — libraries, layouts, algorithms, frameworks, component architecture.
- **A global graph containing every artifact**, under any name, behind any control.
- **Saved views or any persistence** beyond the address of the current view.
- **Hosting, runtime APIs, graph databases, product-management platforms, AI inference** — unchanged and still excluded.
