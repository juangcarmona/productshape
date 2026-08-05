---
id: CHG-NO-OPERATIONS-001
type: product-change
title: A change that declares no operations
status: draft
base-revision: '3f2a91c'
---

## Problem

The change omits `operations`, which the schema requires, so nothing records what it intends to add, modify or remove.

## Intended Product Outcome

The validator reports the omission as a schema violation.

## Rationale

Operations are the change's statement of intent. A change without them cannot be validated as an overlay.

## Affected Product Areas

None; this fixture exists to exercise the schema.

## Open Questions

None.

## Product Acceptance

Validating this document produces PRODUCT002.

## Out of Scope

Everything else.
