---
id: TERM-CITATION
type: domain-term
title: Citation
status: active
defined-in: BC-DELIVERY-INTEGRATION
synonyms:
  - product citation
---

## Definition

A machine-verifiable reference from a consumer document to canonical product text. A citation carries the target product artifact ID, the digest of the content it was recorded against and, optionally, an anchor naming one verification scenario. Citation verification derives exactly one status from those recorded values and the current product model: `current`, `stale`, `tampered` or `unresolved`.

## Distinguish From

- **A Product Change.** A Product Change proposes how product intent should differ. A citation binds delivery or other consumer work to product intent; it does not change that intent or report the change's lifecycle.
- **A copy of product text.** A citation points to canonical text and makes drift detectable. Any embedded projection is checked against the canonical artifact and never becomes authoritative.
- **Delivery evidence.** A current citation proves that a consumer document is grounded in the cited product content. It does not prove implementation, verification, release or deployment.

## Usage

`prodshape cite` emits citations for consumer documents, and `prodshape citations verify` checks them against the current model. Citations let product-definition work and implementation work proceed at independent cadence while retaining a deterministic link to the accepted intent each consumer uses.
