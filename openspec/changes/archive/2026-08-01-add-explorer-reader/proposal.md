# Proposal: add-explorer-reader

## Why

**SLI-EXPLORER-002** (work item `github:juangcarmona/productshape#47`, handoff `HOF-GITHUB-47`) delivers the Product Explorer's second capability: read an artifact and understand every canonical relationship it holds. The baseline Reader already renders one dominant artifact with counted, collapsible, directed relationship groups; what the modified FR-SNAPSHOT-002 adds is navigation context — following an edge keeps the discovery, and the way back is visible and named.

## What Changes

- Relationship links carry the active catalog state, so following an edge preserves the discovery.
- The Reader names the discovery it returns to — kind, status, context, filter and query — visibly on every viewport, retraceable in one step; without a discovery it reads "All artifacts".
- Tests for context preservation, the named way back, and complete counts with title and identifier on every entry.

## Capabilities

### Modified Capabilities

- `snapshot-generation`: the Reader preserves and names the reader's navigation context.

## Impact

- `packages/core/src/snapshot.ts` (relationship links, backlink), `snapshot.test.ts`.
- Out of scope: the Focused Topology (SLI-EXPLORER-003); any change to group semantics already delivered (counts, collapse, direction were in place and are re-verified).
