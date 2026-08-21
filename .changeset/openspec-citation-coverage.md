---
'@prodshape/integration-openspec': minor
'@prodshape/cli': minor
'@prodshape/core': minor
---

OpenSpec citation coverage (CHG-OPENSPEC-COVERAGE-001 and -002, FR-OPENSPEC-001):

- The merged proposal rules now mandate a dedicated, semantic-first propose-phase impact pass: compare the change's motivating intent (the backlog item, if one exists) against the entire product definition to identify every artifact the change depends on, alters or contradicts; expand that set structurally with `prodshape impact <ID>` over direct and transitive neighbours; record the impacted set in the proposal; cite every impacted artifact from each document that derives from it; and record examined-but-excluded neighbours.
- The merged proposal rules now mandate surfacing product-definition drift: when the change's goals contradict or exceed the accepted definition, the divergence is recorded in the proposal as an explicit warning naming the artifacts involved — carried by the machine-readable marker `<!-- pdac-drift ids="..." summary="..." -->` on a line of its own — and the resolution (a Product Change, an adapted change) belongs to humans. Drift is never resolved silently.
- New `prodshape drift` command: enumerate every recorded drift warning across consumer documents (`--provider openspec` enumerates the population, archived material tagged), reporting document, artifacts (with per-ID resolution against the model) and summary. A report, never a gate: recorded drift exits 0.
- `citations verify --provider openspec` now always enumerates archived changes and verifies their citations, reporting every defect found in archived material as a warning (history is immutable; its drift is information). The scope gate keeps applying to current documents only. `--include-archived` now holds archived documents to the full gate — scope declarations and error severities — instead of merely adding them to the scan.
