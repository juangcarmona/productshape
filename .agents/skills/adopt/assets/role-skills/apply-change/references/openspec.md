# apply-change: OpenSpec

Provided by `openspec init`. Not installed by adoption where OpenSpec is present. The configuration's **Provided roles** section records which OpenSpec-generated skill satisfies this contract here, with the name resolved from live tooling in the adoption session.

**Delegation rules**

- The stage delegates task execution to that skill and never re-implements it. Branch, commit and gate logic stay in the stage.
- Check off each task in the change's `tasks.md` **as it lands**, not at close-out. A change that ends with unchecked tasks forces the archive to reconstruct completion from the diff — a failure mode observed three times running in production use of this wiring.
- Read apply state from `openspec status` rather than counting checkboxes by hand: the CLI owns what "done" means for an artifact.

*Done when:* every task in the change's task list is checked and the working tree carries the change.
