# Tasks: add-explorer-overview-catalog

Product input: handoff `HOF-GITHUB-46`, slice `SLI-EXPLORER-001`, work item
`github:juangcarmona/productshape/issues/46`.

## 1. Catalog state in the address

- [x] 1.1 `?k/s/c/f/q` parsed and serialized in a fixed order; filter and query changes re-address
      in place without history entries; unknown params ignored safely.
- [x] 1.2 List entries, search results and the detail backlink carry the active state, so opening a
      result and returning resumes the discovery.
- [x] 1.3 A fresh window at a catalog address reproduces the same result set and control state.

## 2. Canonical filters

- [x] 2.1 Bounded-context filter, present only when the model declares bounded contexts.
- [x] 2.2 No filter exists for a property the canonical model does not record.

## 3. Overview

- [x] 3.1 Kind rows are family entry points into the narrowed Catalog.
- [x] 3.2 Global search field on the first screen; Enter lands in the Catalog with the query live.

## 4. Evidence

- [x] 4.1 Tests: entry points, overview search, replace-history on filter changes, address
      restoration, open-and-return preservation, context-filter presence/absence, no invented
      filters (7 new tests; 346 total green).
- [x] 4.2 Harness measures catalog filter latency; run at scales 1/5/10 and recorded.

## 5. Coverage

- [x] 5.1 `product-coverage.yaml`; `prodshape coverage check` passes.
