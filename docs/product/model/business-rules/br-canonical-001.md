---
id: BR-CANONICAL-001
type: business-rule
title: Authored product artifacts are canonical
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

The authored files under the product root — Markdown product artifacts and authored delivery-slice
YAML — are the single source of truth for product knowledge; every product graph, index, diagram,
handoff and context document is derived from them and MUST be reproducible from them at any time.

## Rationale

A product definition only stays trustworthy if there is exactly one place where knowledge lives.
The moment a generated index, diagram or handoff can hold knowledge that the authored artifacts do
not, the two drift apart and nobody can say which one is right. Keeping authored artifacts
canonical means reviews, diffs and Git history always operate on the real product definition, and
derived outputs can be deleted, regenerated or reformatted freely without any loss of meaning. It
also keeps AI assistance safe: an assistant may draft canonical files for a human to review, but
nothing an assistant or a tool generates downstream can silently become authoritative.

## Examples

- A team member edits a generated managed file to "fix" a description. `prodshape doctor`
  detects the manual modification and reports it; the fix belongs in the authored artifact, after
  which regeneration reproduces the corrected output.
- All generated output — the compiled product graph, reverse indexes, diagrams, product-context
  documents — is deleted from a working copy. Nothing is lost: a single rebuild from the authored
  artifacts restores every derived file identically.
- A Product Handoff becomes stale because an authored artifact changed. The handoff is regenerated
  from the canonical files; the handoff itself is never hand-patched to match.

## Exceptions

None.
