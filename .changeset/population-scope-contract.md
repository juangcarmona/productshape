---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/integration-openspec': minor
'@prodshape/integration-speckit': minor
---

Complete population-aware scope declarations per the frozen citation contract. Every current consumer document needs exactly one explicit declaration: `pdac-scope: cited` with at least one citation (bound), or `pdac-scope: none` with a non-empty human-authored reason (exempt), written as `pdac-scope-reason:` in frontmatter or `reason="..."` in the comment form. Citations alone no longer bind; an undeclared or unrecognized declaration is unclassified (`PRODUCT064`), and an exemption without a reason or contradicted by citations is one `PRODUCT066` per document. Provider verification now excludes archived history by default (`--include-archived` verifies its citations as warnings, scope gate current-only) and reports the provider identity and integration version; `SddIntegrationProvider` gains a required `version`.
