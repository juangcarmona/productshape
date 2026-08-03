# Proposal: add-explorer-overview-catalog

## Why

CHG-SNAPSHOT-004 defines the Product Explorer; its first slice, **SLI-EXPLORER-001** (work item `github:juangcarmona/productshape#46`, handoff `HOF-GITHUB-46`), delivers the first user capability: enter the Explorer, understand the aggregate product, and locate any artifact. The baseline already orients and searches well; what it lacks is the Catalog as a workspace — discovery state that is addressable, shareable and preserved across opening a result — plus family entry points and search from the first screen.

## What Changes

- **Catalog state lives in the address** (`#/artifacts?k=&s=&c=&f=&q=`, fixed serialization order): every filter or query change re-addresses in place (replace-history), a fresh window reproduces the same result set, and list/search/backlink links carry the state so opening a result and returning resumes the discovery.
- **Bounded-context filter**, generated only when the model declares bounded contexts; no invented filterable properties.
- **Overview family entry points**: each kind row opens the Catalog narrowed to that family.
- **Global search from the Overview**: a search field on the first screen lands in the Catalog with the query live.
- The measurement harness gains **catalog filter latency**, measured at the three reference scales.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the catalog's discovery state becomes addressable and preserved; the orientation view gains family entry points and permanent search access.

## Impact

- `packages/core/src/snapshot.ts` (routing, filters, overview markup), `snapshot.test.ts`, `scripts/measure-snapshot.mts`.
- Out of scope, binding: the Reader contract (SLI-EXPLORER-002), the Focused Topology and the layered-map withdrawal (SLI-EXPLORER-003), search ranking (FR-SNAPSHOT-004 reused as-is), any release metadata.

## Open questions carried from the Product Change

None outstanding; resolutions are recorded in CHG-SNAPSHOT-004 and carried in product-context.md.
