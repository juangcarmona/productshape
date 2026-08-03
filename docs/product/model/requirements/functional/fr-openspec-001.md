---
id: FR-OPENSPEC-001
type: functional-requirement
title: Integrate with OpenSpec through sidecar artifacts
status: active
derived-from:
  - UC-CITATIONS-VERIFY-001
  - BR-SDD-001
  - CON-SDD-AGNOSTIC
verification:
  - scenario: The adapter places handoff, context and coverage sidecars in a native OpenSpec change
  - scenario: Regenerating the product context leaves native OpenSpec artifacts byte-identical
  - scenario: Product IDs are preserved unchanged across the adapter boundary
---

## Requirement

The product MUST integrate with OpenSpec exclusively through sidecar artifacts: the adapter places the Product Handoff document, the generated product context and the coverage mapping alongside the native artifacts of an OpenSpec change, without replacing or rewriting any of them. Regenerating the product context MUST touch only the sidecar files and leave every native OpenSpec artifact unchanged. Every product artifact ID MUST be preserved verbatim across the adapter boundary, so that coverage evidence and traceability refer to the same IDs the product model uses.

## Rationale

OpenSpec owns its own change format, workflow and lifecycle; the adapter's job is to bring product context to where delivery happens, not to colonize the framework. Sidecars achieve that: the OpenSpec change stays fully native and fully owned by the delivery team, while the product knowledge travels beside it with its provenance intact. Preserving product IDs is what makes the round trip possible — coverage recorded against FR-X in the OpenSpec change can be validated against FR-X in the product model without any translation table that could rot. This is the concrete shape of the framework-independence constraint: one adapter, a versioned contract, and no OpenSpec concept leaking back into the product model.

## Acceptance Scenarios

- A handoff is delivered into an OpenSpec change. The change directory afterwards contains its native artifacts plus the handoff document, the product context and the coverage sidecar; no native file was created, modified or removed by the adapter.
- The product context is regenerated after an artifact update. Only the sidecar files change; every native OpenSpec artifact is byte-identical before and after.
- The coverage sidecar and the product context refer to requirements, use cases and rules by the exact IDs used in the product model, and coverage validation resolves them without translation.
