---
id: CHG-SNAPSHOT-V2
type: product-change
title: "Make the Product Explorer's three map views the snapshot's primary experience"
status: applied
base-revision: 'bcae539e5fce7f5d6fe1a6badc5ce118bfaa8958'
operations:
  add:
    - FR-SNAPSHOT-BUSINESS-LENS
  modify:
    - FR-SNAPSHOT-PROJECTIONS
    - FR-SNAPSHOT-ORIENTATION
    - FR-SNAPSHOT-TOPOLOGY
    - FR-SNAPSHOT-ADDRESSING
    - QR-PRESENTATION
    - QR-SCALABILITY
    - TERM-PRODUCT-EXPLORER
    - TERM-FOCUSED-TOPOLOGY
    - TERM-GRAPH-PROJECTION
    - TERM-PRODUCT-SNAPSHOT
    - UC-SNAPSHOT-EXPLORE
    - JRN-SNAPSHOT
  remove: []
---

Schema reference: docs/specification/frontmatter-reference.md#product-change

## Problem

The Product Snapshot answers "what does this artifact say" well and "what is this product" poorly. Its Overview shows counts and a kind-by-kind table but, by rule, no artifact; its only visual of relationships, the Focused Topology, shows counted groups the reader opens one at a time beside a Reader that already lists the same groups as text. A reader who wants to see the product — what it is made of, which context each part belongs to, what touches what — has nothing to look at.

The rules that produced this were written against two failed designs: a whole-model circle that was illegible, and a banded map that said nothing the identifiers did not. They forbid any view of every artifact at once, any global grouping, and any third projection (FR-SNAPSHOT-PROJECTIONS, formerly FR-SNAPSHOT-005); they forbid artifact-level content on the Overview (FR-SNAPSHOT-ORIENTATION, formerly FR-SNAPSHOT-003); they fix the Focused Topology as the one neighbourhood view (FR-SNAPSHOT-TOPOLOGY, formerly FR-SNAPSHOT-009); and they forbid the glow that makes a lit neighbourhood readable (QR-PRESENTATION, formerly QR-PRESENTATION-001).

A spike built on this repository's own compiled graph showed a third design that works: one tile per kind with every artifact as a chip, use cases and terms grouped by bounded context, a neighbourhood lit on hover, a Focus view centring one artifact among its neighbours, and a Columns view laying the model out kind by kind. The product owner and others who saw it found it far clearer than the current snapshot (research in juangcarmona/productshape#312).

The snapshot also has nothing for the reader who thinks in business terms. Everything such a reader asks of a use case is in the model, but scattered across several artifacts and labelled with relationship names.

## Intended Product Outcome

The Product Definition says:

- **Three map views over the whole model.** The Overview map shows one region per kind with every artifact as a chip. The Focus view centres the selected artifact with its neighbours grouped by kind around it and the rest of the model faded behind. The Columns view shows one column per kind, in the order actors, journeys, use cases, bounded contexts, business rules, domain terms, functional requirements, quality requirements, constraints, structured behaviours. Use cases and domain terms are grouped by bounded context. Unclassifiable artifacts are still drawn, in a labelled group.
- **The maps are alive and deterministic.** Pan by drag, zoom by wheel or pinch, with keyboard and visible controls too. Hover or keyboard focus lights an artifact's direct neighbours. Click or Enter focuses it; in the Columns view a click selects and a double click focuses. Breadcrumb and Back retrace. Layout depends only on the model, the viewport and reader state.
- **A neon highlight is allowed** on the lit artifact, its neighbours and their lines, designed for both the light and the dark appearance, never the only signal and never at the cost of contrast.
- **A business lens.** One control turns a use case into a card in business language: Goal and Trigger, who uses it, rules it must obey by their statements, behaviours that prove them, quality and constraints one line each, and what a change would put in question. No identifiers, no relationship names, nothing the snapshot does not carry.
- **Addressing extends to the new views.** The active view, the Focus view's disclosure state and the lens are in the address; the camera is not.
- **Scalability is restated** around the static markup, which stays bounded by the kinds, and the drawing of every artifact as a chip from the embedded data.

The following stay as stated and remain binding on every view above:

- one self-contained file that works offline and regenerates byte-identically (FR-SNAPSHOT-PAGE, QR-DETERMINISM);
- ranked offline search (FR-SNAPSHOT-SEARCH);
- the Catalog (FR-SNAPSHOT-CATALOG);
- the Artifact Reader with full Markdown (FR-SNAPSHOT-READER);
- one shared selection and addressable view state (FR-SNAPSHOT-ADDRESSING, extended here);
- light, dark and system appearance (QR-PRESENTATION, extended here);
- full keyboard operation, and meaning never by colour alone (QR-ACCESSIBILITY, unchanged).

Every artifact and relationship stays reachable as text through the Reader, so the maps remain accelerators.

## Rationale

The prohibitions protected real properties: legibility, honesty about what the graph contains, no reliance on a picture for navigation, and reproducibility. The map views keep every one of them as an explicit obligation and drop only the premise that seeing the whole product is itself the failure. Grouping by kind and by bounded context uses distinctions the model records, so the arrangement adds no claim. The Columns order is the order the methodology uses to explain a product and is stated as a convention, not a ranking.

The business lens adds no fact. It gathers what the model already holds for a use case and phrases the connections in the reader's words. It leaves out what the snapshot does not carry, notably Product Changes in progress and citation freshness, which UC-SNAPSHOT-EXPLORE assigns to the repository side.

The product owner, Juan G. Carmona, approved this direction and the scope above ("Sí, las dos") in the session that requested this change. The written artifacts are offered for his review in the pull request that applies them.

## Affected Product Areas

The Product Snapshot's Product Explorer:

- its projections and the three map views (`FR-SNAPSHOT-PROJECTIONS`);
- the Overview (`FR-SNAPSHOT-ORIENTATION`);
- the Focus view, replacing the Focused Topology (`FR-SNAPSHOT-TOPOLOGY`, `TERM-FOCUSED-TOPOLOGY`);
- the addressable state (`FR-SNAPSHOT-ADDRESSING`);
- presentation and scalability (`QR-PRESENTATION`, `QR-SCALABILITY`);
- the new business lens (`FR-SNAPSHOT-BUSINESS-LENS`);
- the vocabulary and narrative that describe it (`TERM-PRODUCT-EXPLORER`, `TERM-GRAPH-PROJECTION`, `TERM-PRODUCT-SNAPSHOT`, `UC-SNAPSHOT-EXPLORE`, `JRN-SNAPSHOT`).

`FR-SNAPSHOT-PAGE`, `FR-SNAPSHOT-SEARCH`, `FR-SNAPSHOT-CATALOG`, `FR-SNAPSHOT-READER`, `QR-ACCESSIBILITY`, `QR-DETERMINISM`, `CON-NO-WEB-UI` and `CON-NO-GRAPH-DATABASE` are unchanged and binding.

## Open Questions

None.

## Product Acceptance

Read the thirteen proposed artifacts against their baseline and confirm:

- The four rules named in the Problem now permit the Overview map, the Focus view, the Columns view and the neon highlight, and say what each must and must not do.
- Every property listed as still binding is either untouched or restated, never weakened.
- The business lens shows only embedded data, hides identifiers and relationship names, and states what it leaves out.
- No requirement names an implementation technique.
- `prodshape change validate CHG-SNAPSHOT-V2` reports zero errors.

## Out of Scope

- Delivery, technical design and implementation: layout algorithm, palette values, glow values, gesture thresholds.
- Embedding Product Changes, citation status or any repository-side state in the snapshot.
- Any change to search ranking, the Catalog, the Reader's content, the single-file packaging, CON-NO-WEB-UI or the persistence boundary.
- Editing, arranging or saving maps.
