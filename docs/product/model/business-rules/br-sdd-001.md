---
id: BR-SDD-001
type: business-rule
title: SDD frameworks consume product context but do not own product semantics
status: active
applies-to:
  - BC-DELIVERY-INTEGRATION
---

## Rule

SDD frameworks receive product knowledge exclusively through versioned Product Handoffs, retain
native ownership of their own specification, design, task and verification artifacts, MAY report
questions and contradictions back, and MUST NOT silently rewrite canonical product knowledge.

## Rationale

An SDD framework is excellent at driving one implementation increment from spec to verified code,
but its artifacts are scoped to that increment and expressed in its own conventions. If SDD
artifacts could redefine product semantics, the product definition would fragment across
framework-specific formats and the canonical model would stop being canonical. The handoff
boundary keeps both sides strong: the product model supplies a stable, versioned contract with
digests and a source revision, and the SDD framework works natively — its proposals, specs and
tasks are never mirrored into or overwritten by the product side. Feedback still flows, but as
explicit questions and contradictions that a human resolves through the change process, never as
silent edits.

## Examples

- Product knowledge for an OpenSpec increment arrives as a Product Handoff with sidecar files
  placed alongside the OpenSpec change; OpenSpec keeps full native ownership of its proposal,
  specs and tasks, and the sidecars are consumed as read-only context.
- During implementation a developer discovers that two active business rules contradict each
  other for an edge case. The contradiction returns as an open question on the originating
  Product Change; it is resolved there and, if needed, promoted — the SDD framework never patches
  the rules itself.
- An SDD tool proposes rewording a domain term to match its spec language. The rewording is
  raised as feedback on the product side; nothing in the canonical model changes until a Product
  Change says so.

## Exceptions

None.
