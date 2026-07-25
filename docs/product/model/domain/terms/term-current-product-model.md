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

The set of product artifacts under the model area of the product root, describing the product as
currently defined — behaviour that is implemented and accepted. It is called the baseline when a
Product Change is validated against it: the fixed reference state that overlay validation applies
a change's operations to without modifying it.

## Distinguish From

- **Proposed future-state artifacts inside a Product Change.** Those describe what an artifact
  would become if the change were promoted. Until promotion, they are proposals; the current
  product model contains only accepted knowledge.
- **The product graph.** The graph is a derived view compiled from the current product model (or
  from an overlay). The model is the authored files; the graph can always be rebuilt from them.
- **The repository.** The repository also holds changes, slices, handoffs, templates and
  generated output. The current product model is only the accepted artifact set, not everything
  under version control.

## Usage

The current product model is what `product-definition validate` checks when no change is in
scope, the baseline that every overlay is applied to, the source from which Product Handoffs
package subgraphs, and the reference against which handoff staleness is judged. Promotion is
defined as the only operation, after the initial bootstrap, that modifies it.
