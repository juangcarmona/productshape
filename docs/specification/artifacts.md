# Artifacts

This chapter defines the artifact types of the current product model, their frontmatter contracts,
required body sections and lifecycle states. Product Changes, Delivery Slices and Product Handoffs
are specified in their own chapters.

## Common contract

Every product artifact is a Markdown file whose YAML frontmatter MUST include:

```yaml
---
id: FR-VALIDATE-001 # stable immutable ID, see identifiers.md
type: functional-requirement # one of the types below
title: Detect unresolved artifact references
status: active # artifact lifecycle state
---
```

- `type` MUST be one of: `actor`, `journey`, `use-case`, `business-rule`, `domain-term`,
  `bounded-context`, `functional-requirement`, `quality-requirement`, `constraint`.
- Frontmatter MUST validate against the JSON Schema for its `type`
  (`schemas/<type>.schema.json`). Unknown frontmatter properties are invalid. The exhaustive
  per-kind field tables — required and optional properties, allowed values, ID patterns — are in
  the [Frontmatter reference](frontmatter-reference.md), generated from those schemas.
- The Markdown body MUST contain the required sections for its type as `##` headings, in the
  order listed. Additional sections MAY follow the required ones.
- Every artifact type additionally accepts the optional `provenance` object
  ([Frontmatter reference → Provenance](frontmatter-reference.md#provenance)).
- Artifacts MUST NOT carry author, owner, date, version or review metadata; Git history is the
  record of who changed what and when. `provenance` is not an exception to this rule but a
  different concern: it records the **evidence** behind recovered knowledge — its source, the
  confidence that evidence supports, and how it was recovered. Provenance is an epistemic property
  of the claim, not a record of authorship, and it SHOULD be set only on artifacts recovered from
  an existing system.
- Artifact bodies describe product behaviour and obligations. They MUST NOT contain implementation
  design (class names, package names, algorithms, framework or storage choices) unless naming an
  externally imposed, externally visible constraint is unavoidable.

## Artifact lifecycle

The artifact lifecycle (`artifactStatus`) is:

| Status       | Meaning                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| `draft`      | Incomplete or not yet approved. Not part of the accepted product definition. |
| `active`     | Part of the current product definition.                                      |
| `deprecated` | Still present but scheduled for replacement or removal.                      |
| `retired`    | No longer active; retained only for historical traceability.                 |

Rules:

- An `active` artifact MUST NOT reference a `retired` artifact.
- A reference from an `active` artifact to a `deprecated` artifact SHOULD produce a warning.
- `draft` artifacts MAY reference other `draft` artifacts.
- This lifecycle applies to product artifacts only. Product Changes and Delivery Slices have their
  own lifecycles (see [Product Changes](product-changes.md) and
  [Delivery Slices](delivery-slices.md)); the three lifecycles are distinct and MUST NOT be mixed.

## Actor (`actor`, `ACT-`)

An Actor identifies who or what interacts with the product to achieve a meaningful outcome.

Additional frontmatter: `actor-kind` (required) — one of `human`, `external-system`,
`scheduled-process`, `product`.

Required body sections: `## Purpose`, `## Goals`, `## Responsibilities`, `## Boundaries`.

Actors are not personas. Actor artifacts MUST NOT model demographics or fictional persona details.

## Journey (`journey`, `JRN-`)

A Journey describes an end-to-end outcome pursued by an actor. It may cross use cases, channels,
bounded contexts, external systems, manual activities, waiting periods, branches and failure paths.

Additional frontmatter: `primary-actor` (required, Actor ID); `steps` (required, ordered list of
`- use-case: <UC id>` entries defining the main journey).

Required body sections: `## Intended Outcome`, `## Entry Conditions`, `## Journey Narrative`,
`## Variants and Branches`, `## Completion Conditions`.

Branches and exceptional paths belong in the body. There is no workflow DSL: `steps` defines the
main ordered path only. Journeys MUST NOT describe screen-by-screen UI behaviour unless the UI
sequence is materially part of the product behaviour.

## Use Case (`use-case`, `UC-`)

A Use Case describes a concrete interaction through which an actor obtains a product outcome.

Additional frontmatter: `primary-actor` (required, Actor ID); `supporting-actors` (optional, list
of Actor IDs); `bounded-context` (optional, Bounded Context ID); `governed-by` (optional, list of
Business Rule IDs); `uses-terms` (optional, list of Domain Term IDs).

Required body sections: `## Goal`, `## Trigger`, `## Preconditions`, `## Main Flow`,
`## Alternative Flows`, `## Failure Conditions`, `## Postconditions`.

The body describes observable behaviour, not implementation design.

## Business Rule (`business-rule`, `BR-`)

A Business Rule expresses durable product knowledge that governs behaviour. A rule that applies to
multiple use cases or requirements MUST be independently identifiable and reusable rather than
hidden inside stories, acceptance criteria, UI validation, code, database constraints, tests or SDD
tasks.

Additional frontmatter: `applies-to` (optional, list of Journey, Use Case or Bounded Context IDs).

Required body sections: `## Rule`, `## Rationale`, `## Examples`, `## Exceptions`.

The `## Rule` section MUST contain one clear normative statement.

## Domain Term (`domain-term`, `TERM-`)

A Domain Term establishes shared meaning.

Additional frontmatter: `defined-in` (required, Bounded Context ID); `synonyms` (optional, list of
strings).

Required body sections: `## Definition`, `## Distinguish From`, `## Usage`.

A term's definition MUST NOT merely repeat its title.

## Bounded Context (`bounded-context`, `BC-`)

A Bounded Context is a product-language boundary: it delimits where a set of domain terms carries a
specific meaning. Bounded contexts in v0.1 do not imply aggregates, implementation modules or
source-code structure.

Additional frontmatter: none beyond the common contract. In particular, `owns-terms` MUST NOT be
authored: term ownership is derived from `Domain Term.defined-in`
(see [Relationships](relationships.md)).

Required body sections: `## Responsibility`, `## Language`, `## Boundaries`,
`## External Relationships`.

## Functional Requirement (`functional-requirement`, `FR-`)

A Functional Requirement is a derived product obligation stating what the product must do.

Additional frontmatter: `derived-from` (required, non-empty list of Use Case, Business Rule or
Constraint IDs); `verification` (required, non-empty list of `- scenario: <text>` entries).

Required body sections: `## Requirement`, `## Rationale`, `## Acceptance Scenarios`.

The `## Requirement` section MUST use explicit normative language. A requirement MUST NOT be a
disguised implementation task and MUST retain traceability to the product knowledge it derives
from.

## Quality Requirement (`quality-requirement`, `QR-`)

A Quality Requirement states a measurable quality obligation.

Additional frontmatter: `quality-attribute` (required, string such as `portability`,
`determinism`); `applies-to` (required, non-empty list of Journey, Use Case or Bounded Context
IDs); `verification` (required, non-empty list of `- scenario: <text>` entries).

Required body sections: `## Requirement`, `## Measurement`, `## Verification`.

Vague quality statements ("the system should be fast") do not satisfy this contract: the
`## Measurement` section MUST state how conformance is measured.

## Constraint (`constraint`, `CON-`)

A Constraint expresses an externally imposed or deliberately fixed boundary.

Additional frontmatter: `applies-to` (optional, list of Journey, Use Case or Bounded Context IDs).
When `applies-to` is absent, the constraint applies to the entire product.

Required body sections: `## Constraint`, `## Rationale`, `## Consequences`.
