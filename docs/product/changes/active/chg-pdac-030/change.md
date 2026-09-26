---
id: CHG-PDAC-030
type: product-change
title: Support the explicit PDaC v0.3 contract
status: proposed
base-revision: a85b8b7
operations:
  add:
    - FR-PDAC-030
  modify: []
  remove: []
---

## Problem

The accepted v0.3 specification introduces Domain Lifecycle, one-hop impact accounting and visible downstream citation impact. ProductShape currently exposes only the v1alpha1 contract.

## Intended Product Outcome

Repositories explicitly choose v1alpha2 while existing v1alpha1 repositories retain their behavior. Authors can validate domain behaviour, account for neighbouring model impact, inspect downstream citations before apply, and inspect external evidence claims.

## Rationale

The reference implementation must demonstrate the accepted contracts before release. Explicit selection avoids silently reinterpreting an existing repository.

## Affected Product Areas

Validation, Product Change apply, citations and external Verification Evidence.

## Open Questions

None.

## Product Acceptance

The packaged CLI passes the pinned v0.3 operation and validation cases and retains v0.2 conformance. Independent tests demonstrate pre-write reporting, unchanged trees on refused apply and rollback after an execution failure.

## Out of Scope

Test execution, suite management, recursive impact propagation, automatic citation refresh, release publication and migration of the repository's own accepted baseline.
