# Frontmatter reference

The exhaustive field contract of every document kind: which properties are allowed, which are required, and what values they accept.

[Artifacts](artifacts.md) defines what each artifact type _means_ and why it exists; this chapter defines the _fields_. Where the two appear to disagree, the JSON Schemas under `schemas/` win — the tables below are generated from them (`pnpm docs:frontmatter`) and a conformance test fails the build if they drift.

Every kind is a **closed** object: an unknown property is a `PRODUCT002` error, not a warning and not silently ignored. There is no extension point. If you need to record something the schema does not allow, put it in the Markdown body.

The same contract is available from the command line, which needs no repository and no network:

```bash
prodshape schema use-case
```

## How to read the tables

| Column | Meaning |
| --- | --- |
| Field | The YAML key. `a.b` is a nested key; `a[]` is an array element, and `a[].b` a key of an element object. |
| Required | Whether the key must be present. For a nested key, whether it is required _when its parent is present_. |
| Type | `string`, `const` (one permitted value), `enum`, `array`, `object`. |
| Allowed values | The permitted values, or the regular expression a string must match. |
| Notes | Constraints and guidance carried by the schema itself. |

Four fields are common to every Markdown-authored kind: `id` (stable and immutable, see [Identifiers](identifiers.md)), `type`, `title` and `status`. Artifact `status` is `draft | active | deprecated | retired`; Product Changes and Delivery Slices have their own lifecycles.

## Provenance

`provenance` is an optional object accepted by all nine artifact kinds. It records the **evidence** behind recovered knowledge: where a claim came from and how strongly the evidence supports it.

Set it on recovered (brownfield) artifacts. Leave it unset on greenfield artifacts authored from intent — there is no evidence to cite, and an empty claim of provenance is worse than none.

Provenance is deliberately _not_ authorship metadata. [Artifacts](artifacts.md) forbids author, owner, date, version and review fields because Git history already records who changed what and when. Provenance answers a different question: how far to trust this artifact's content.

A `draft` artifact whose `provenance.confidence` is `low` produces a `PRODUCT111` warning, so the queue of candidates needing human validation is derivable from `prodshape validate` output rather than tracked by hand.

| Field | Required | Allowed values | Meaning |
| --- | --- | --- | --- |
| `source` | yes | free text | A file path, a URL, a ticket reference, or `interview: <person>`. |
| `confidence` | yes | `high`, `medium`, `low` | `high`: read directly from a specification scenario or a test. `medium`: inferred from structured prose. `low`: inferred from indirect evidence such as a variable name. |
| `recovered-from` | no | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered. Optional, because real evidence is often more than one of these. |

```yaml
provenance:
  source: src/orders/validation.ts (limit check), tests/orders/limits.spec.ts
  confidence: high
  recovered-from: observation
```

`provenance` itself is closed: an unrecognised sub-field such as `recovered-by` is a `PRODUCT002` error, and omitting `confidence` while providing `source` is too.

---

## Artifact frontmatter

The nine artifact types of the current product model.

### Actor

`ACT-`. Who or what interacts with the product to achieve a meaningful outcome. See [Artifacts → Actor](artifacts.md#actor-actor-act-).

<!-- BEGIN GENERATED: actor -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^ACT-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `actor` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `actor-kind` | yes | enum | `human`, `external-system`, `scheduled-process`, `product` |  |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: actor -->

### Journey

`JRN-`. An end-to-end outcome pursued by an actor. `steps` defines the main ordered path only; branches and exceptional paths belong in the body. See [Artifacts → Journey](artifacts.md#journey-journey-jrn-).

<!-- BEGIN GENERATED: journey -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^JRN-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `journey` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `primary-actor` | yes | string | `^ACT-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `steps` | yes | array of object |  | The main ordered journey. Branches and exceptional paths belong in the body. At least one entry. |
| `steps[].use-case` | yes | string | `^UC-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: journey -->

### Use Case

`UC-`. A concrete interaction through which an actor obtains a product outcome. See [Artifacts → Use Case](artifacts.md#use-case-use-case-uc-).

<!-- BEGIN GENERATED: use-case -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^UC-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `use-case` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `primary-actor` | yes | string | `^ACT-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `supporting-actors` | no | array of string |  |  |
| `supporting-actors[]` | yes | string | `^ACT-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `bounded-context` | no | string | `^BC-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `governed-by` | no | array of string |  |  |
| `governed-by[]` | yes | string | `^BR-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `uses-terms` | no | array of string |  |  |
| `uses-terms[]` | yes | string | `^TERM-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: use-case -->

### Business Rule

`BR-`. Durable product knowledge that governs behaviour. See [Artifacts → Business Rule](artifacts.md#business-rule-business-rule-br-).

<!-- BEGIN GENERATED: business-rule -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^BR-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `business-rule` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `applies-to` | no | array of string |  |  |
| `applies-to[]` | yes | string | `^(JRN\|UC\|BC)-[A-Z0-9]+(-[A-Z0-9]+)*$` | A journey, use case or bounded context. |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: business-rule -->

### Domain Term

`TERM-`. Shared meaning within a bounded context. Ownership is authored here, on the term, and never on the context. See [Artifacts → Domain Term](artifacts.md#domain-term-domain-term-term-).

<!-- BEGIN GENERATED: domain-term -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^TERM-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `domain-term` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `defined-in` | yes | string | `^BC-[A-Z0-9]+(-[A-Z0-9]+)*$` | Canonical direction of term ownership. Bounded contexts never author owns-terms. |
| `synonyms` | no | array of string |  |  |
| `synonyms[]` | yes | string |  | Must not be empty. |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: domain-term -->

### Bounded Context

`BC-`. A product-language boundary. Note the absence of `owns-terms`: term ownership is derived from `Domain Term.defined-in` and MUST NOT be authored here (see [Relationships](relationships.md)). See [Artifacts → Bounded Context](artifacts.md#bounded-context-bounded-context-bc-).

<!-- BEGIN GENERATED: bounded-context -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^BC-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `bounded-context` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: bounded-context -->

### Functional Requirement

`FR-`. A derived product obligation stating what the product must do. `derived-from` is what keeps it traceable to the knowledge it came from. See [Artifacts → Functional Requirement](artifacts.md#functional-requirement-functional-requirement-fr-).

<!-- BEGIN GENERATED: functional-requirement -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^FR-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `functional-requirement` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `derived-from` | yes | array of string |  | Traceability to the use cases, business rules or constraints this requirement originates from. At least one entry. |
| `derived-from[]` | yes | string | `^(UC\|BR\|CON)-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `verification` | yes | array of object |  | At least one entry. |
| `verification[].scenario` | yes | string |  | Must not be empty. |
| `verification[].id` | no | string | `^[A-Z0-9]+(-[A-Z0-9]+)*$` | Optional stable id, unique within the artifact. When present, the scenario is citable via anchor (see the Citation Contract). |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: functional-requirement -->

### Quality Requirement

`QR-`. A measurable quality obligation. See [Artifacts → Quality Requirement](artifacts.md#quality-requirement-quality-requirement-qr-).

<!-- BEGIN GENERATED: quality-requirement -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^QR-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `quality-requirement` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `quality-attribute` | yes | string |  | Must not be empty. |
| `applies-to` | yes | array of string |  | At least one entry. |
| `applies-to[]` | yes | string | `^(JRN\|UC\|BC)-[A-Z0-9]+(-[A-Z0-9]+)*$` | A journey, use case or bounded context. |
| `verification` | yes | array of object |  | At least one entry. |
| `verification[].scenario` | yes | string |  | Must not be empty. |
| `verification[].id` | no | string | `^[A-Z0-9]+(-[A-Z0-9]+)*$` | Optional stable id, unique within the artifact. When present, the scenario is citable via anchor (see the Citation Contract). |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: quality-requirement -->

### Constraint

`CON-`. An externally imposed or deliberately fixed boundary. When `applies-to` is absent the constraint applies to the entire product. See [Artifacts → Constraint](artifacts.md#constraint-constraint-con-).

<!-- BEGIN GENERATED: constraint -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^CON-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `constraint` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `active`, `deprecated`, `retired` | Lifecycle of a product artifact. |
| `applies-to` | no | array of string |  |  |
| `applies-to[]` | yes | string | `^(JRN\|UC\|BC)-[A-Z0-9]+(-[A-Z0-9]+)*$` | A journey, use case or bounded context. |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: constraint -->

---

## Product Change frontmatter

### Product Change

No ID: the directory name under `docs/product/changes/` identifies the draft. A lightweight drafting aid for a proposed product change, living at `docs/product/changes/<slug>/change.md` while work is in flight, deleted or archived when the PR merges. Not a normative model artifact: no overlay, no promotion, no lifecycle states beyond draft/done.

<!-- BEGIN GENERATED: product-change -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `type` | yes | const | `product-change` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `done` | draft while the change is in flight; done when the PR is ready to merge. |
| `affected-artifacts` | no | array of string |  | Artifact IDs this change intends to add, modify or remove. Informational: not validated as an overlay. |
| `affected-artifacts[]` | yes | string | `^(ACT\|JRN\|UC\|BR\|TERM\|BC\|FR\|QR\|CON)-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |

<!-- END GENERATED: product-change -->

`prodshape change validate` applies this schema to every draft it finds, so the closed contract holds here as it does for artifacts: a field the table does not list is a `PRODUCT002` error. An `affected-artifacts` entry the model does not contain is reported as `PRODUCT112`, a warning, because a draft proposing to add that artifact is the expected case.

Note that `provenance` is **not** accepted here. A recovery change carries provenance on its proposed artifacts, which are ordinary artifact documents, not on the change itself.

---

## Document fields (YAML kinds)

Three YAML document kinds complete the change and handoff flow. Their normative semantics live in [Delivery Slices](delivery-slices.md) and the [Handoff Contract](handoff-contract.md); the tables below are the field index.

### Delivery Slice

`SLI-`. Authored by hand (or proposed by the slicing skill) under a change's `slices/` directory. `implements` declares coverage per requirement; `scope` becomes required when `coverage` is `partial`. See [Delivery Slices](delivery-slices.md).

### Product Handoff

`HOF-`. **Generated, never authored by hand.** `prodshape handoff create` produces it and `prodshape handoff status` reports its staleness. Documented here so the contract is inspectable. See [Handoff Contract](handoff-contract.md).

### Product Coverage

**Adapter-owned.** Written alongside an SDD change to evidence that a slice's requirements were implemented, and checked before archive. See [Adopting in an existing OpenSpec repository](../adoption/existing-openspec-repository.md).
