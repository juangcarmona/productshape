---
description: Process one bounded ProductShape recovery round and resume from persisted files.
---

# Product Recovery

Create or continue the named recovery session under `.specify/productshape/recoveries/<session>/` with `prodshape speckit-product recover-start --session <session>`, then request one batch with `prodshape speckit-product recover-next --session <session>`. Require a human-confirmed brief before reading evidence; honor ordered tiers, forbidden paths, and explicitly authorized external sources. Process at most the deterministic next batch, record findings, provenance, confidence, leads, questions, retractions and invalidation in the persisted session, then validate the progressive `CHG-INITIAL` overlay and report the next recommendation.

A new session must work from repository files alone. An insufficient-evidence result is honest: it produces no accepted-model delta and cannot apply. Never edit `docs/product/model`, and never use Spec Kit workflow-run JSON as the recovery record.
