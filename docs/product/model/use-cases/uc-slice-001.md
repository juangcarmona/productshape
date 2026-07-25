---
id: UC-SLICE-001
type: use-case
title: Slice a Product Change into delivery increments
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-DELIVERY-INTEGRATION
governed-by:
  - BR-CHANGE-001
uses-terms:
  - TERM-DELIVERY-SLICE
  - TERM-PRODUCT-CHANGE
---

## Goal

An approved Product Change is divided into coherent vertical increments, each independently
deliverable, with explicit requirement coverage, dependencies between slices, verification for
each slice, and a stated out-of-scope — so delivery can proceed in pieces without losing the
whole.

## Trigger

The Product Engineer starts slicing an approved change, typically with the AI Assistant
executing the slicing skill to propose a cut.

## Preconditions

- The Product Change is approved.
- The change's requirements are complete enough to distribute across increments.

## Main Flow

1. The AI Assistant analyzes the approved change and proposes slices: vertical cuts that each
   deliver observable product value rather than horizontal technical layers.
2. Each proposed slice states which requirements of the change it implements, which product
   artifacts it affects, and which other slices it depends on.
3. Each slice carries its own verification: how delivery will show the slice is done.
4. Anything the slice deliberately leaves out is recorded as out-of-scope, so partial coverage
   is a decision, not an accident.
5. The engineer adjusts the proposal — merging, splitting or re-scoping slices — until the cut
   matches how the team wants to deliver.
6. The slices are validated structurally against the change they belong to.
7. A human reviews and approves each slice.

## Alternative Flows

- Single-slice change: a small change becomes one slice covering all its requirements; the same
  coverage and approval rules apply.
- Deferred scope: requirements intentionally left for a later change are recorded as such rather
  than silently dropped from every slice.

## Failure Conditions

- Partial coverage without scope: slices that together leave requirements of the change neither
  covered nor explicitly out of scope are invalid.
- Foreign references: a slice referencing requirements or artifacts from a different Product
  Change is invalid.

## Postconditions

- The change is covered by approved slices with explicit coverage, dependencies, verification
  and out-of-scope.
- Each slice is ready to become a Product Handoff when delivery picks it up.
