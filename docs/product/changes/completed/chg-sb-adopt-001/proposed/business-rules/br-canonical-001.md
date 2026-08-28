---
id: BR-CANONICAL-001
type: business-rule
title: Authored product artifacts are canonical
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

The authored Markdown product artifacts in the accepted model are the single source of current product knowledge. Product Changes are the separate canonical record of proposed and completed semantic evolution. Every product graph, reverse index, diagram, snapshot and citation-status report is derived from canonical files and MUST be reproducible from them at any time.

## Rationale

A product definition only stays trustworthy if there is exactly one place where current product knowledge lives. The moment a generated index, diagram, snapshot or report can hold knowledge that the authored artifacts do not, the two drift apart and nobody can say which one is right. Keeping authored artifacts canonical means reviews, diffs and Git history operate on the real product definition, while Product Changes retain why it evolved and derived outputs can be deleted, regenerated or reformatted without loss. It also keeps AI assistance safe: an assistant may draft canonical files for human review, but nothing generated downstream can silently become authoritative.

## Examples

- A team member edits a generated managed file to "fix" a description. `prodshape doctor` detects the manual modification and reports it; the fix belongs in the authored artifact, after which regeneration reproduces the corrected output.
- Deleting every generated output from a working copy loses nothing; `SB-REGENERATION-RESTORES` carries that behaviour.
- A citation becomes stale because canonical product text changed. Verification reports the mismatch; neither the citation nor a generated report is treated as product truth.

## Exceptions

None.
