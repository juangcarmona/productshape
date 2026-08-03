---
id: FR-SNAPSHOT-009
type: functional-requirement
title: Traverse relationships through the Focused Topology
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-RELATIONSHIPS-001
verification:
  - scenario: The projection is anchored on the selected artifact and shows its immediate canonical relationships, grouped by relationship meaning and, where useful, by artifact type
  - scenario: Every collapsed group exposes its complete count, so nothing collapsed is silently omitted
  - scenario: Detail appears only through deliberate reader action — expanding a group or following a path
  - scenario: Selecting another artifact produces a newly focused projection; expansions do not accumulate indefinitely
  - scenario: A dense relationship set falls back to a structured list or another legible representation rather than a denser drawing
  - scenario: Every related artifact shown or counted is also reachable through the Reader, the Catalog, search and deep links
  - scenario: The projection is deterministic for the same model, the same focus and the same explicit reader state
  - scenario: No visual device implies lifecycle, maturity, importance, sequence, causality or dependency absent from the canonical relationships
  - scenario: The projection draws no node, relationship or direction the compiled graph does not contain
---

## Requirement

The Product Explorer MUST provide a Focused Topology: a visual relationship projection that is
local, bounded and progressive.

The selected artifact MUST be the focus. The projection MUST present the focus's immediate
canonical relationships grouped by relationship meaning and, where it aids comprehension, by
artifact type. Incoming and outgoing relationships MUST be distinguished where direction matters,
by means other than colour alone. Every collapsed group MUST expose its complete count: collapsed
content is never silently omitted.

Detail MUST appear only through deliberate reader action — expanding a group, or following a path
to a related artifact. Selecting another artifact MUST produce a newly focused projection on that
artifact; the projection MUST NOT accumulate the whole traversal indefinitely. Where a relationship
set is too dense for a legible drawing, the projection MUST fall back to a structured list or
another legible representation rather than drawing more at once.

Every related artifact the projection shows or counts MUST remain reachable through expansion, the
Artifact Reader, the Catalog, search and deep links — the projection is an accelerator, never the
only route.

For the same model content, the same focus and the same explicit reader state, the projection MUST
be identical. It MUST draw only nodes, relationships and directions the compiled graph contains,
and no visual device — position, size, colour, ordering or animation — MAY invent lifecycle,
maturity, importance, sequence, causality or dependency that is absent from the canonical
relationships.

## Rationale

A visual neighbourhood earns its place when it answers "what does this artifact touch, and through
what" faster than prose can — and it forfeits that place the moment it grows past one focus. Both
rejected directions failed on exactly that boundary: an arrangement asked to carry the whole
product stops being readable precisely where reading matters. Locality is not a limitation of this
projection; it is its definition.

The newly-focused rule — refocusing replaces rather than accumulates — is what keeps a traversal
legible at any depth. The reader's continuity lives in the shared selection state, the browser's
history and the Reader, not in an ever-growing picture. Complete counts on collapsed groups keep
the boundedness honest: the reader always knows exactly what they are choosing not to look at.

The fallback to structured lists concedes openly what dense graphs prove: past some density, a list
communicates more than a drawing. Since the Reader already carries every relationship as text, the
projection can afford to be strictly legible or absent — it never has to be complete.

## Acceptance Scenarios

- A reader focuses a use case: its governing rules, its actors, its terms and the requirements
  derived from it appear as grouped, counted, directed relationships around it.
- The most connected artifact in the model is focused: large groups start collapsed with their
  complete counts, nothing expands unbidden, and expanding one group changes nothing else silently.
- The reader follows a path to a related artifact: the projection refocuses on it; the previous
  focus is one Back-press away, not a residue on the canvas.
- A relationship set too dense to draw legibly is presented as a structured list; every entry
  remains selectable.
- With the projection unavailable, every relationship it would show is read in the Artifact Reader
  and reached through the Catalog and deep links.
- The same model, focus and reader state produce the identical projection in two fresh windows.
- The projection is compared against the compiled graph: nothing drawn or counted is absent from
  it, and no visual device implies an order, importance or dependency the graph does not record.
