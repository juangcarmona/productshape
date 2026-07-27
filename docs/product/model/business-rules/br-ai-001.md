---
id: BR-AI-001
type: business-rule
title: Deterministic validation is never delegated to an AI model
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
  - BC-DELIVERY-INTEGRATION
---

## Rule

Structural invariants of the product definition — schema conformance, identity, reference
resolution, lifecycle rules, overlay application and content digests — MUST be enforced
exclusively by deterministic tooling; AI models perform semantic reasoning only, and everything
they produce is validated by that same deterministic tooling.

## Rationale

Structural correctness must be reproducible: the same files must yield the same diagnostics on
every machine, every run, forever. AI models are probabilistic, so delegating schema checks,
reference resolution or digest computation to a model would make validation results vary between
runs and erode trust in every downstream artifact — overlays, handoffs, staleness reports. The
division of labour is strict and complementary: AI is valuable for drafting artifacts, spotting
semantic gaps, suggesting distinctions between terms and reviewing rationale, while the
deterministic toolchain remains the sole judge of whether the result is structurally valid.

## Examples

- An AI assistant drafts a new business-rule artifact. The draft passes through the same
  `prodshape validate` command as any human-authored file; the assistant's confidence
  counts for nothing if a reference does not resolve.
- Repository hooks that guard the product model run deterministic commands such as validation and
  doctor checks. No hook ever asks a model to judge whether an artifact is valid.
- Staleness of a Product Handoff is decided by comparing content digests, a pure computation. An
  AI summary of "what probably changed" may accompany the report but never determines staleness.

## Exceptions

None.
