# Relationships

The relationships are the methodology: they connect intent (actors), behaviour (journeys, use
cases), knowledge (rules, terms, contexts) and obligations (requirements), and they carry
traceability through changes, slices and handoffs.

## Canonical vocabulary

Every relationship has exactly one canonical direction: it is authored on one artifact type, in one
frontmatter field, targeting an allowed set of types.

| Source                 | Field                      | Allowed targets                                             |
| ---------------------- | -------------------------- | ----------------------------------------------------------- |
| Journey                | `primary-actor`            | Actor                                                       |
| Journey                | `steps[].use-case`         | Use Case                                                    |
| Use Case               | `primary-actor`            | Actor                                                       |
| Use Case               | `supporting-actors`        | Actor                                                       |
| Use Case               | `bounded-context`          | Bounded Context                                             |
| Use Case               | `governed-by`              | Business Rule                                               |
| Use Case               | `uses-terms`               | Domain Term                                                 |
| Business Rule          | `applies-to`               | Journey, Use Case, Bounded Context                          |
| Domain Term            | `defined-in`               | Bounded Context                                             |
| Functional Requirement | `derived-from`             | Use Case, Business Rule, Constraint                         |
| Quality Requirement    | `applies-to`               | Journey, Use Case, Bounded Context                          |
| Constraint             | `applies-to`               | Journey, Use Case, Bounded Context; absent = entire product |
| Product Change         | `operations.add`           | any product artifact (new ID)                               |
| Product Change         | `operations.modify`        | any existing product artifact                               |
| Product Change         | `operations.remove`        | any existing product artifact                               |
| Delivery Slice         | `implements[].requirement` | Functional Requirement, Quality Requirement, Constraint     |
| Delivery Slice         | `affects`                  | any product artifact                                        |
| Delivery Slice         | `depends-on`               | Delivery Slice                                              |
| Product Handoff        | `implements`               | Functional Requirement, Quality Requirement, Constraint     |
| Product Handoff        | `affects`                  | any product artifact                                        |

A relationship referencing an unknown ID, or targeting a type outside the allowed set, is a
validation error.

## Derived relationships

Reverse relationships are always derived by the graph compiler and MUST NOT be authored or
manually maintained. Users never maintain reciprocal references.

The canonical/derived split is decided once per pair. The load-bearing case:

- **`Domain Term.defined-in` is canonical. `Bounded Context.owns-terms` is derived.**
  A bounded context's owned terms are exactly the domain terms whose `defined-in` references it.
  `owns-terms` MUST NOT appear in authored bounded-context frontmatter; schemas reject it. Tools
  MAY display `owns-terms` in inspection output and generated indexes as a derived field.

All other reverse views (`Actor ← journeys`, `Business Rule ← governed use cases`,
`Use Case ← derived requirements`, and so on) follow the same rule: derived, displayed, never
authored.

## Status interactions

- An `active` artifact MUST NOT reference a `retired` artifact (error).
- An `active` artifact referencing a `deprecated` artifact SHOULD produce a warning.
- `draft` artifacts MAY reference `draft` artifacts.

## Reachability

Some diagnostics depend on _reachability_, defined deterministically as follows: two artifacts are
connected if a path exists between them in the undirected view of the product graph restricted to
the canonical product relationships above (excluding Product Change, Delivery Slice and Product
Handoff edges). A requirement is _reachable from an actor_ when it is connected to at least one
Actor node under this definition.
