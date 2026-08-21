---
'@prodshape/integration-openspec': minor
'@prodshape/cli': minor
'@prodshape/core': minor
---

OpenSpec citation coverage (CHG-OPENSPEC-COVERAGE-001, -002 and -003, FR-OPENSPEC-001):

- The merged proposal rules now require an impact pass before any proposal content is written: compare the change's intent (the backlog item, if there is one) with the whole product definition to find every artifact the change depends on, alters or contradicts; widen that list with `prodshape impact <ID>`; record the list in the proposal; cite every impacted artifact from each document that uses it; and name the neighbours that were checked and left out.
- The merged proposal rules now require surfacing product-definition drift: when the change's goals contradict or go beyond the definition, the divergence is recorded in the proposal as an explicit warning naming the artifacts involved — with the marker `<!-- pdac-drift ids="..." summary="..." -->` on its own line — and the decision (a Product Change, or an adjusted change) belongs to humans. Drift is never fixed quietly.
- New `prodshape drift` command: list every recorded drift warning across consumer documents (`--provider openspec` covers the whole population, archived material marked), reporting document, artifacts (with whether each still exists in the model) and summary. A report, never a gate: recorded drift exits 0.
- `citations verify --provider openspec` now always includes archived changes and checks their citations, reporting everything found in archived material as a warning (archived history cannot be edited; its drift is information). The scope gate keeps applying to current documents only. `--include-archived` now applies the full gate — scope declarations and error severities — to archived documents too.
