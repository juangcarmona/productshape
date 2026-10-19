# sync-specs: OpenSpec

Provided by `openspec init`. Not installed by adoption where OpenSpec is present. The configuration's **Provided roles** section records which OpenSpec-generated skill satisfies this contract here, with the name resolved from live tooling in the adoption session.

**Delegation rules**

- The stage delegates the fold to that skill and never re-implements it.
- One ordering rule survives whatever the tool: **bring the branch up to date with the target before folding.** Folding deltas into out-of-date specifications is what makes sequential merges conflict.
- Fold **before** archiving, on the branch, so the reviewed diff carries both the fold and the archive.

*Done when:* the change's delta specifications are folded into the project specifications on the branch, with no conflicts left behind.
