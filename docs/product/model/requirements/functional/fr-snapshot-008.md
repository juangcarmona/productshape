---
id: FR-SNAPSHOT-008
type: functional-requirement
title: Discover artifacts at scale through the Catalog
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-IDENTITY-001
verification:
  - scenario: Artifacts are discoverable by stable identifier, by title and by indexed content, and browsable by canonical artifact family
  - scenario: Result sets can be narrowed by canonical fields — artifact type, status, and bounded context where the field exists — and by nothing invented
  - scenario: A query-and-filter state produces a deterministic result set, and its address reproduces the same result set when opened elsewhere
  - scenario: Opening an artifact from the Catalog preserves the active query and filters, and returning resumes them
  - scenario: Search, filtering and browsing remain responsive at the reference corpus scale
  - scenario: No requirement of the Catalog names a UI framework, virtualization library or implementation algorithm
---

## Requirement

The Product Explorer MUST provide a Catalog: the primary large-scale discovery mechanism over the
complete model.

The Catalog MUST support search by stable identifier, by title and by indexed content — ranked as
FR-SNAPSHOT-004 defines — and browsing by canonical artifact family. It MUST support narrowing by
canonical fields: artifact type, status, and bounded context where the model declares one. It MUST
NOT invent filterable properties the canonical model does not record.

A given query-and-filter state MUST produce a deterministic result set for identical model content,
and that state MUST be linkable: its address reproduces the same result set, consistent with
FR-SNAPSHOT-006. Opening an artifact from the Catalog MUST preserve the active query and filters,
so that returning to the Catalog resumes the discovery in progress rather than restarting it.

Search, filtering and browsing MUST remain responsive at the reference corpus scale that
QR-SCALABILITY-001 defines.

This requirement states observable behaviour only. It MUST NOT be read as choosing a UI framework,
a virtualization library, an index structure or any implementation algorithm.

## Rationale

At corpus scale, discovery is the experience: a reader who cannot find an artifact cannot read it,
and a reader who loses their query every time they open a result will stop opening results. The
Catalog is where "every artifact is reachable" becomes a practical claim rather than a structural
one — reachable in a few keystrokes, not reachable in principle.

Determinism and linkability extend the snapshot's existing philosophy to result sets: two readers
who share an address must see the same list, for the same reason they must see the same artifact.
Preserving the query across an open-and-return is what makes the Catalog a workspace instead of a
lookup dialog — real discovery is iterative, and each iteration must not restart the last.

Filtering only by canonical fields keeps the Catalog honest: a filter is a claim that the model
records a distinction, and inventing one would put knowledge in the snapshot that the authored
files do not carry.

## Acceptance Scenarios

- A reader types a stable identifier, a title fragment and a body phrase; each finds its artifact,
  ranked as the search requirement defines. A reader browses into one artifact family and reaches
  every artifact of that family.
- A reader filters by type and status, then by bounded context on a model that declares them. The
  result set narrows exactly; no filter is offered for a property the model does not record.
- The address of a query-and-filter state is copied and opened in a fresh window from local disk:
  the same result set appears in the same order.
- A reader opens a result, reads it, and returns: the query, the filters and the result set are as
  they were left.
- The same interactions are exercised on the reference corpus and remain responsive, measured as
  QR-SCALABILITY-001 requires.
