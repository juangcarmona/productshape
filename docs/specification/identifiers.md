# Identifiers

## Grammar

Every independently addressable artifact has a stable ID matching:

```text
<PREFIX>-<SEGMENT>(-<SEGMENT>)*
SEGMENT = [A-Z0-9]+
```

IDs are uppercase. The prefix is fixed per artifact type:

| Prefix  | Type                   |
| ------- | ---------------------- |
| `ACT-`  | Actor                  |
| `JRN-`  | Journey                |
| `UC-`   | Use Case               |
| `BR-`   | Business Rule          |
| `TERM-` | Domain Term            |
| `BC-`   | Bounded Context        |
| `FR-`   | Functional Requirement |
| `QR-`   | Quality Requirement    |
| `CON-`  | Constraint             |
| `CHG-`  | Product Change         |
| `SLI-`  | Delivery Slice         |
| `HOF-`  | Product Handoff        |

An ID whose prefix does not match its artifact's `type` is invalid. Authored IDs MUST be unique
within one product repository across all artifact kinds.

## Generated identifiers

`HOF-` is the one prefix whose IDs the tooling mints rather than a human authoring them. A Product
Handoff ID is derived from the work-item reference it packages:
`HOF-<provider>-<work-item id>`, uppercased.

That derivation does not guarantee uniqueness. One work item delivering more than one delivery slice
produces one handoff per slice, all carrying the same ID, and nothing currently rejects it. The
intended shape is one work item per slice, which keeps IDs unique; the gap and the candidate fixes
are recorded as `OD-009` in `OPEN-DECISIONS.md`. Consumers MUST NOT resolve a handoff by ID alone:
evidence discovery matches on the handoff's recorded `source.product-change` and
`source.delivery-slice`, which are unambiguous.

IDs MAY be human-readable (`ACT-PRODUCT-ENGINEER`, `FR-VALIDATE-001`). Readability is encouraged
but carries no semantics: tools MUST treat IDs as opaque.

## Immutability

- An ID becomes immutable when the artifact is first accepted into the current product model
  (by the initial baseline or by promotion of a Product Change).
- An ID MUST never be reused, including after its artifact is retired or removed.
- The artifact's title, file path, body and relationships MAY change; the ID MUST NOT.
- A Product Change that modifies an existing artifact MUST use the same ID in its proposed
  future-state artifact.

## Identity is not location

Identity is defined by the `id` field only:

- IDs MUST NOT be inferred from file paths or file names.
- Moving or renaming an artifact file does not change its identity.
- References between artifacts MUST use IDs, never paths or titles.

## File naming

An artifact's file name SHOULD be its lowercase ID followed by `.md` (for example
`fr-validate-001.md` for `FR-VALIDATE-001`). Validation MUST treat file-name misalignment as a
warning (`PRODUCT101`), never as an error and never as an identity mechanism.
