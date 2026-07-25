# Tasks — implement-product-change-and-handoff

## 1. Change overlays

- [x] 1.1 Load changes (change.md, proposed artifacts, slices) with shared diagnostics
- [x] 1.2 Overlay application over the baseline artifact list
- [x] 1.3 Operation validation PRODUCT020-026 and PRODUCT108
- [x] 1.4 Cross-change overlap detection PRODUCT025
- [x] 1.5 CLI: change validate / validate --change
- [x] 1.6 Unit and conformance tests (valid addition, collision, valid/invalid modification,
      valid/invalid removal, overlapping changes)

## 2. Delivery slices

- [x] 2.1 Slice loading and schema validation
- [x] 2.2 Reference resolution against the overlay, PRODUCT030-032
- [x] 2.3 Tests (valid slice, partial without scope, foreign change, cycle)

## 3. Handoff and staleness

- [x] 3.1 Git helper (HEAD revision, show at revision)
- [x] 3.2 Closure-rule subgraph selection over the overlay graph
- [x] 3.3 Handoff YAML + product-context.md generation with digests
- [x] 3.4 handoff status: current / stale / invalid / source-revision-unavailable
- [x] 3.5 CLI: handoff create / handoff status
- [x] 3.6 Tests incl. stale-on-relevant-edit and current-on-unrelated-edit, golden handoff and
      context snapshots

## 4. Promotion

- [x] 4.1 Promotion plan with preconditions and PRODUCT027 revision compatibility
- [x] 4.2 Promotion apply (writes, deletes, move to completed), dry-run
- [x] 4.3 CLI: change promote [--dry-run]
- [x] 4.4 End-to-end test: change -> slices -> handoff -> stale/current -> promote

## 5. Integration

- [x] 5.1 inspect/impact report affecting changes, slices, handoffs
- [x] 5.2 lint, typecheck, test, build green; CLI self-application still clean
