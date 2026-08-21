---
'@prodshape/integration-openspec': minor
'@prodshape/cli': minor
---

OpenSpec citation coverage (CHG-OPENSPEC-COVERAGE-001, FR-OPENSPEC-001):

- The merged proposal rules now mandate a dedicated propose-phase impact pass: run `prodshape impact <ID>` on every touched PDaC artifact, walk the direct and transitive neighbours, cite every impacted artifact from each document that derives from it, and record examined-but-excluded neighbours in the proposal.
- `citations verify --provider openspec` now always enumerates archived changes and verifies their citations, reporting every defect found in archived material as a warning (history is immutable; its drift is information). The scope gate keeps applying to current documents only. `--include-archived` now holds archived documents to the full gate — scope declarations and error severities — instead of merely adding them to the scan.
