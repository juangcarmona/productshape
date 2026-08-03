---
id: FR-SCHEMA-001
type: functional-requirement
title: Expose the frontmatter contract of every artifact kind
status: active
derived-from:
  - UC-SCHEMA-001
verification:
  - scenario: The contract for a kind lists required and optional properties with their permitted values
  - scenario: The contract is obtainable with no product model present
  - scenario: The contract is derived from the definitions validation enforces, and a change to those definitions is reflected without a separate edit
  - scenario: An unrecognised kind is reported as an invalid request naming the kinds that exist
---

## Requirement

The product MUST let a user obtain the complete frontmatter contract of any artifact kind: which
properties are required, which are optional, what values each accepts, and which body sections the
kind requires. Nested properties and array element contracts MUST be included. The answer MUST state
that unrecognised properties are rejected.

The contract MUST be derived from the same definitions that validation enforces, so that it cannot
describe a contract the product does not apply. A change to those definitions MUST be reflected in
the answer without a separate authoring step, and a discrepancy between the two MUST be detectable
automatically.

Obtaining the contract MUST NOT require a product model to exist, because the need arises before one
does. A request naming no kind MUST list the kinds that exist. A request naming an unrecognised kind
MUST be reported as an invalid request, distinguishably from a valid question about a model that
happens to have no answer.

## Rationale

`PRODUCT002` tells an author that a property is not allowed. It cannot tell them which properties
are, because a schema violation is evidence about one document, not a description of the contract. An
author who reasons from the methodology toward a field the schema lacks — as the first external
adoption did with provenance, across 28 artifacts — has no local way to check before writing.

Deriving the answer rather than documenting it is the load-bearing part. A hand-maintained list of
allowed fields is a second source of truth that drifts the first time a schema changes under a
deadline; the drift then teaches authors to distrust the documentation and go back to guessing.
Requiring the discrepancy to be automatically detectable is what makes the guarantee hold rather than
merely being intended.

The no-repository requirement follows from when the question is asked. Someone deciding whether to
adopt, or deciding what their first artifact should contain, does not yet have a model. A contract
lookup that demands one is unavailable at exactly the moment it is most useful.

## Acceptance Scenarios

- An engineer asks for the contract of a use case. The answer lists the required properties with
  their identifier patterns and lifecycle values, the optional relationship properties, the nested
  provenance properties, and the required body sections in order.
- An engineer asks in a directory containing no product definition. The contract is returned
  successfully rather than refused for want of a repository.
- A permitted value is added to an artifact kind's definition. The exposed contract reflects it, and
  had it not, an automated check would have failed.
- An engineer asks for a kind that does not exist. The product reports an invalid request and lists
  the kinds that do, without printing a partial contract.
