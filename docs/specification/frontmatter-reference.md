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

Four fields are common to every Markdown-authored kind: `id` (stable and immutable, see [Identifiers](identifiers.md)), `type`, `title` and `status`. Artifact `status` is `draft | active | deprecated | retired`; the Product Change lifecycle is a separate state machine, listed with its own kind below.

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
| `uses-terms` | no | array of string |  |  |
| `uses-terms[]` | yes | string | `^TERM-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
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
| `uses-terms` | no | array of string |  |  |
| `uses-terms[]` | yes | string | `^TERM-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
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
| `verification` | yes | array of one of 2 forms |  | One or more inline verification scenarios or Structured Behaviour references. At least one entry. |
| `verification[]` | yes | one of 2 forms |  | Each value matches exactly one of the forms below. |
| `verification[].scenario` | yes | string |  | Form 1. Must not be empty. |
| `verification[].id` | no | string | `^[A-Z0-9]+(-[A-Z0-9]+)*$` | Form 1. Optional stable id, unique within the artifact. When present, the inline scenario is citable via anchor (see the Citation Contract). |
| `verification[].scenario-ref` | yes | string | `^SB-[A-Z0-9]+(-[A-Z0-9]+)*$` | Form 2. |
| `uses-terms` | no | array of string |  |  |
| `uses-terms[]` | yes | string | `^TERM-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
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
| `verification` | yes | array of one of 2 forms |  | One or more inline verification scenarios or Structured Behaviour references. At least one entry. |
| `verification[]` | yes | one of 2 forms |  | Each value matches exactly one of the forms below. |
| `verification[].scenario` | yes | string |  | Form 1. Must not be empty. |
| `verification[].id` | no | string | `^[A-Z0-9]+(-[A-Z0-9]+)*$` | Form 1. Optional stable id, unique within the artifact. When present, the inline scenario is citable via anchor (see the Citation Contract). |
| `verification[].scenario-ref` | yes | string | `^SB-[A-Z0-9]+(-[A-Z0-9]+)*$` | Form 2. |
| `uses-terms` | no | array of string |  |  |
| `uses-terms[]` | yes | string | `^TERM-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
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
| `uses-terms` | no | array of string |  |  |
| `uses-terms[]` | yes | string | `^TERM-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `provenance` | no | object |  | Evidence behind recovered knowledge. Set on recovered (brownfield) artifacts only. |
| `provenance.source` | yes | string |  | Where the knowledge came from: a file path, a URL, a ticket reference, or 'interview: <person>'. Must not be empty. |
| `provenance.confidence` | yes | enum | `high`, `medium`, `low` | high: read directly from a specification scenario or a test. medium: inferred from structured prose. low: inferred from indirect evidence such as a variable name. |
| `provenance.recovered-from` | no | enum | `observation`, `inference`, `interview`, `documentation` | How the knowledge was recovered from the evidence. |

<!-- END GENERATED: constraint -->

---

## Product Change frontmatter

### Product Change

`CHG-`. The semantic delta that carries the Product Definition from one accepted state to the next. A live change lives at `docs/product/changes/active/<chg-id>/change.md` with its complete proposed future-state artifacts under `proposed/`; applying it archives the change under `docs/product/changes/completed/<chg-id>/`. `CHG-INITIAL` is reserved for the single initialisation change that establishes the first Product Definition.

<!-- BEGIN GENERATED: product-change -->

| Field | Required | Type | Allowed values | Notes |
| --- | --- | --- | --- | --- |
| `id` | yes | string | `^CHG-[A-Z0-9]+(-[A-Z0-9]+)*$` |  |
| `type` | yes | const | `product-change` |  |
| `title` | yes | string |  | Must not be empty. |
| `status` | yes | enum | `draft`, `proposed`, `approved`, `applied`, `rejected`, `superseded` | Lifecycle of a product change. |
| `base-revision` | yes | string | `^[0-9a-f]{7,40}$` | The baseline Git revision this change was created against. The exact string 0000000 is the no-baseline sentinel only for CHG-INITIAL. |
| `operations` | yes | object |  |  |
| `operations.add` | yes | array of string |  |  |
| `operations.add[]` | yes | string | `^(ACT\|JRN\|UC\|BR\|TERM\|BC\|FR\|QR\|CON\|SB)-[A-Z0-9]+(-[A-Z0-9]+)*$` | Any artifact of the current product model. |
| `operations.modify` | yes | array of string |  |  |
| `operations.modify[]` | yes | string | `^(ACT\|JRN\|UC\|BR\|TERM\|BC\|FR\|QR\|CON\|SB)-[A-Z0-9]+(-[A-Z0-9]+)*$` | Any artifact of the current product model. |
| `operations.remove` | yes | array of string |  |  |
| `operations.remove[]` | yes | string | `^(ACT\|JRN\|UC\|BR\|TERM\|BC\|FR\|QR\|CON\|SB)-[A-Z0-9]+(-[A-Z0-9]+)*$` | Any artifact of the current product model. |

<!-- END GENERATED: product-change -->

`prodshape change validate` applies this schema to every live change, so the closed contract holds here as it does for artifacts: a field the table does not list is a `PRODUCT002` error. Quote `base-revision` when the revision is all digits, otherwise YAML reads it as a number and the string pattern rejects it.

The operations declare intent and the `proposed/` directory carries the future state, so the two must agree: an ID under `add` or `modify` without a proposed artifact, or a proposed artifact no operation names, is a `PRODUCT026` error. See [Validation](validation.md) for the full set of change diagnostics.

Note that `provenance` is **not** accepted here. A change recovered from a brownfield system carries provenance on its proposed artifacts, which are ordinary artifact documents, not on the change itself.
