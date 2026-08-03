# Tasks — add-init-dry-run-and-doctor-checks

- [x] 1.1 Split `installProvider` into `planProvider` and `applyProviderPlan`, keeping the lock read at apply time so installing a second provider does not drop the first
- [x] 1.2 Split `initRepository` into `planInit` and `applyInitPlan`, with the plan carrying content
- [x] 1.3 Classify existing lock-owned targets as `regenerate` rather than `overwrite`
- [x] 1.4 Add `init --dry-run` with grouped output, exit 1 on conflicts, and no filesystem writes
- [x] 1.5 Assert that the planned count and the applied count are equal
- [x] 1.6 Keep the real-run output byte-identical to the previous release
- [x] 1.7 Add the injected `model validation` doctor check, using `validateBaseline` so `doctor` writes nothing
- [x] 1.8 Add the three-state `authoring templates` doctor check
- [x] 1.9 Recommend `init --dry-run` in the brownfield guide and correct the wrong claims about what `init` touches
