# archive-change: OpenSpec

Provided by `openspec init`. Not installed by adoption where OpenSpec is present. The configuration's **Provided roles** section records which OpenSpec-generated skill satisfies this contract here, with the name resolved from live tooling in the adoption session.

**Delegation rules**

- The stage delegates archiving to that skill and never re-implements it.
- Archive **on the branch, after the specification fold, before the merge** — never as a post-merge afterthought. The archive then lands as part of the reviewed diff instead of mutating `main` outside review.
- Confirm incomplete artifacts before archiving: the CLI warns, and the stage surfaces that warning rather than overriding it.

*Done when:* the change folder has moved to the archive location on the branch, and nothing else moved.
