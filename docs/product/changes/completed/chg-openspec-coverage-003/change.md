---
id: CHG-OPENSPEC-COVERAGE-003
type: product-change
title: Drift warnings carry a machine-readable marker and are enumerable for product owners
status: applied
base-revision: 'b4be5a7'
operations:
  add: []
  modify:
    - FR-OPENSPEC-001
  remove: []
---

## Problem

`CHG-OPENSPEC-COVERAGE-002` mandated recording product-definition drift in the proposal as an explicit warning, but the warning is prose: the only way a product owner can review open drift across changes is to read every proposal. A warning that must be hunted for is a warning that will be missed, and the person the warning exists for — the product owner who co-decides the resolution — is exactly the person least likely to be reading OpenSpec proposals document by document.

## Intended Product Outcome

A recorded drift warning carries a machine-readable marker naming the artifacts involved and a one-line summary, on a line of its own inside the proposal's drift note. The product enumerates every recorded drift warning across the consumer-document population deterministically — current work and archived history distinguished — reporting for each the document, the artifacts involved and the summary, so a product owner reviews open drift from one listing without reading every proposal. Enumeration reports; it never gates.

## Rationale

The drift note serves two readers with different needs: the reviewer of one change reads the prose in place, and the product owner sweeping the whole workspace needs a listing. A marker satisfies the second reader without changing anything for the first, and it reuses the mechanism this integration already trusts — machine-readable records authored inside consumer documents, like citations and scope declarations, discovered by deterministic scanning.

The listing stays a report and never a gate because the position from `CHG-OPENSPEC-COVERAGE-002` is unchanged: drift is a disagreement between two human-owned statements of intent, the consumer detects it, and humans resolve it. A failing check would punish recording drift, which teaches agents and developers not to record it; a report makes recorded drift visible, which is the entire point.

## Affected Product Areas

OpenSpec integration (`FR-OPENSPEC-001`), within delivery integration. `BR-SDD-001`, `BR-AI-001` and citation verification (`FR-CITATIONS-VERIFY-001`) are unchanged. The marker is a new record kind in consumer documents alongside citations and scope declarations; it introduces no new diagnostic and does not participate in citation verification.

## Open Questions

None.

## Product Acceptance

`FR-OPENSPEC-001` defines the drift marker form and requires deterministic enumeration of recorded drift warnings across the population, distinguishing archived material, as a report that never gates. The merged rules instruct the consumer to carry the marker inside the drift note. The shipped toolkit enumerates the markers of this repository's consumer documents deterministically.

## Out of Scope

Notifying a backlog tool or any external system of recorded drift is outside the repository boundary. Semantic detection of drift by the enumeration itself is excluded permanently: the command lists what consumers recorded; it does not judge. No diagnostic code is introduced, retired or renumbered.
