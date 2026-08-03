---
id: UC-COVERAGE-001
type: use-case
title: Check requirement coverage of an SDD change
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-DELIVERY-INTEGRATION
governed-by:
  - BR-SDD-001
  - BR-AI-001
uses-terms:
  - TERM-PRODUCT-HANDOFF
  - TERM-DELIVERY-SLICE
---

## Goal

A deterministic verdict on one SDD change: every requirement its sidecar handoff implements is either covered by declared specification and verification evidence, or named as uncovered while the work is still open.

## Trigger

The Product Engineer runs `prodshape coverage check <sdd-change>` — directly, from a hook before SDD closure, or in a continuous integration pipeline. The AI Assistant runs it before reporting an increment as ready.

## Preconditions

- The SDD change contains the sidecar Product Handoff.
- Implementation and verification work has produced evidence worth mapping.

## Main Flow

1. The actor runs the coverage check against the SDD change.
2. The sidecar handoff is read to learn which requirements the increment implements.
3. The declared coverage mapping is validated: every implemented requirement must be mapped to specification and verification evidence.
4. Every declared evidence path is checked for existence; resemblance to a requirement ID counts for nothing.
5. The verdict is reported: covered requirements, uncovered requirements with the documented error code, and a failing exit when anything is uncovered.

## Alternative Flows

- Partial coverage: a requirement mapped as partially covered is reported as a warning so the gap is a visible, deliberate decision.

## Failure Conditions

- The coverage mapping is missing or malformed: the check fails naming every implemented requirement as uncovered.
- A declared evidence path does not exist: the check fails naming the path.
- The mapping references a different handoff than the sidecar: the check fails.

## Postconditions

- The actor knows exactly which implemented requirements lack evidence, before SDD closure.
- No product file, SDD artifact or mapping is modified: the check reports and never edits.
