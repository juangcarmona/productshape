---
'@prodshape/core': minor
'@prodshape/distribution': minor
'@prodshape/cli': minor
---

Acceptance criteria live in `verification[]`: stop requiring a body section that restates them

The specification accepted [RFC 0022](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0022-criteria-in-verification-list.md) (spec PR #24). A requirement's acceptance criteria are carried by `verification[]`, and the body SHOULD NOT restate them, so `## Acceptance Scenarios` left the required body sections of a Functional Requirement and `## Verification` left those of a Quality Requirement.

`requiredBodySections` drops both. This only widens what validates: an artifact that carries the section is still valid, because additional sections have always been permitted, and an artifact that omits it no longer reports `PRODUCT009`. No repository that validated before this change stops validating.

The `functional-requirement` and `quality-requirement` templates stop scaffolding the section, so a newly authored artifact no longer starts life restating its own criteria.

Before this change every case in the spec's conformance corpus failed against `prodshape validate`, because the corpus fixtures had already dropped the sections the specification no longer requires.
