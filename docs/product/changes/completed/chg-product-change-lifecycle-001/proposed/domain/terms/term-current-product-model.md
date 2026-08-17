---
id: TERM-CURRENT-PRODUCT-MODEL
type: domain-term
title: Current Product Model
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - baseline
---

## Definition

The set of product artifacts under the model area on the repository's canonical branch, describing the product intent currently accepted by humans. It is called the baseline when a Product Change is validated against it: the fixed reference state that overlay validation applies a change's operations to without modifying it. Acceptance says what the product is defined to be; it says nothing about whether that intent has been implemented, verified, released or deployed.

## Distinguish From

- **Proposed future-state artifacts inside a Product Change.** Those describe what an artifact would become if the change were approved, applied and its resulting definition accepted by merge. While the change is active, the baseline remains authoritative.
- **Model files after apply on a working branch.** Apply writes the proposed result to the model path, but branch location determines authority: those files remain a proposal until a human merges them into the canonical branch.
- **The product graph.** The graph is a derived view compiled from the current product model (or from an overlay). The model is the authored files; the graph can always be rebuilt from them.
- **The repository.** The repository also holds Product Changes, consumer documents, templates and generated output. The current product model is only the accepted artifact set, not everything under version control.

## Usage

The current product model is what `prodshape validate` checks when no live change is in scope, the baseline that every overlay is applied to, and the canonical reference against which citations are resolved. A Product Change is the only mechanism for semantic evolution: overlay validation leaves the baseline untouched, apply materializes the approved proposal on a working branch, and merge accepts the resulting model on the canonical branch.
