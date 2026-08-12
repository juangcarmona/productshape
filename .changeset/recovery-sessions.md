---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': minor
---

Brownfield recovery sessions. `prodshape recover` manages deterministic, resumable recovery state under `.product/generated/recovery/<session-id>/`: evidence inventory with content hashes (repository, user-provided and explicitly authorised external sources), bounded batches, per-source classification, leads, user questions with persisted answers, staleness detection, CHG-INITIAL overlay revalidation, coverage, completion criteria and a final report. Semantic extraction stays with the rewritten self-contained recover-product skill, whose candidates live only in the proposed overlay of CHG-INITIAL and are never accepted by tooling.
