# /product:audit

Review the product model structurally and semantically.

Use the `audit-product-model` skill.

- Start from `prodshape validate --format json`; never re-derive structural facts the
  tool already reports.
- Review orphaned knowledge, contradictory rules, ambiguous terms, duplicate or
  implementation-shaped requirements, missing failure behaviour and weak traceability.
- Classify findings as ERROR, OBSERVATION or QUESTION and present a report.
- Do not rewrite the model. Fixes go through /product:change.
