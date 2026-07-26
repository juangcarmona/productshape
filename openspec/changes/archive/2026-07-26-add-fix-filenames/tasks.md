# Tasks — add-fix-filenames

- [x] 1.1 Extract `expectedFileName` and have the `PRODUCT101` check use it, so the diagnostic and the
      fix derive the target from one expression
- [x] 1.2 Implement a pure planner: targets, duplicate-target and target-exists blocks, and an empty
      plan for an aligned model
- [x] 1.3 Implement the applier with an injectable rename primitive, two steps through a temporary
      name derived from the target, and all-or-nothing refusal on any blocked entry
- [x] 1.4 Guard against replacing a file the planner never saw (an unparseable document at the target)
- [x] 1.5 Recover interrupted renames on the next run; refuse when the destination is now occupied
- [x] 1.6 Expose `prodshape fix --filenames [--dry-run] [--format json]`, exiting 2 when no fixer is
      named
- [x] 1.7 Exit 1 from `--dry-run` when anything would change, so it can gate CI
- [x] 1.8 Test in four layers: pure planner, injected call sequence, real filesystem, and recovery
- [x] 1.9 Document the command next to `PRODUCT101` and in the brownfield guide
