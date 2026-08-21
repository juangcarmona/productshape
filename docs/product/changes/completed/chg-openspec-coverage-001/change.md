---
id: CHG-OPENSPEC-COVERAGE-001
type: product-change
title: OpenSpec integration mandates an impact pass and verifies archived history as warnings
status: applied
base-revision: '64f96e5'
operations:
  add: []
  modify:
    - FR-OPENSPEC-001
  remove: []
---

## Problem

`FR-OPENSPEC-001` leaves two coverage holes in the OpenSpec integration.

First, the merged citation rules tell a consumer to cite the artifacts its documents derive from, but nothing directs the consumer to _find_ them. Identifying the impacted artifact set is left implicit in the authoring of each document, so a consumer that cites only the artifacts it happened to look at satisfies every rule while silently omitting the neighbours the product graph would have surfaced. The graph exists precisely to answer "what else does this touch?", and the integration never asks the consumer to consult it.

Second, the requirement mandates that "Default verification MUST exclude archived historical changes". Excluded means invisible: a citation inside an archived change whose canonical target has since moved reports nothing at all unless an operator remembers an explicit mode. Drift in history is information a reader of that history needs — the archived change no longer means what it meant — and today the default silently withholds it.

## Intended Product Outcome

The merged rules direct the consumer to identify impacted artifacts as a dedicated step of its propose phase: traversing the product graph from every artifact the change touches, deciding for each direct and transitive neighbour whether the change derives from or alters it, and citing every impacted artifact from each document that derives from it. An examined-and-excluded neighbour is recorded in the proposal, never silently omitted.

Default verification enumerates archived historical changes alongside current documents and verifies the citations archived documents carry, reporting every defect found in archived material as a warning. The scope-declaration gate — bound, exempt or unclassified — applies to current documents only. Holding archived documents to the full gate remains available as an explicit mode.

## Rationale

Citing what you derived from is necessary but not sufficient: completeness of the impacted set is a property of the product graph, not of any one document, so the integration must direct the consumer through the graph before the consumer starts writing. Making the pass a dedicated propose-phase step, with exclusions recorded, turns "cite every artifact it derives from" from an aspiration into a checkable procedure.

Archived history cannot be edited — the workflow forbids rewriting it — so a problem found there is not something anyone can fix in place; it is information about how far the canonical model has moved since that change shipped. Warnings are exactly the right severity for information: visible by default, non-blocking by default, and a repository that wants history drift to block can escalate them with `warnings-as-errors`. Leaving history out hid the information; failing on it would turn an uneditable document into a permanent build failure. Neither serves the reader.

The scope gate stays current-only because binding and exemption are declared while a document is being written; demanding them from documents that predate the mechanism, or that were finished before it applied, would create failures no one can honestly resolve.

## Affected Product Areas

OpenSpec integration (`FR-OPENSPEC-001`), within delivery integration. The governing boundary rules do not move: `BR-SDD-001` keeps consumers citing rather than owning product semantics, and `CON-SDD-AGNOSTIC` keeps the graph traversal in product tooling and the framework specifics in the integration. Citation status computation (`FR-CITATIONS-VERIFY-001`, `UC-CITATIONS-VERIFY-001`) is unchanged: statuses and their diagnostics keep their meaning; this change alters which documents are in the verified population by default and the severity at which archived material's defects are reported.

No actor, journey, term, business rule or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

`FR-OPENSPEC-001` states that the merged rules mandate the dedicated propose-phase impact pass over the product graph, with excluded neighbours recorded. It states that default verification includes archived historical changes, reports their citation defects as warnings, and applies the scope gate to current documents only, with the full gate on archived material as an explicit mode. The shipped integration behaves accordingly and its verification of this repository reports no errors.

## Out of Scope

A machine-checked comparison of a Product Change's declared operations against the citations of the OpenSpec change implementing it (operations-coverage checking) is follow-up tooling under the affected-citation-set work, not part of this change. No diagnostic code is introduced, retired or renumbered. OpenSpec's own lifecycle, skills and native validation are untouched.
