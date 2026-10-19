---
name: integrate
description: "Land an approved change: enforce the Done gate, fold in the specifications, archive the plan, merge, and close the loop in the tracker. Use when integrating, landing or merging an approved work item."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Lifecycle stage 4. Turn an approved change into a **merged** one, with its specifications and its record landing alongside it.

Input is a work item identifier, and it is required. If none was given, ask for one before starting.

Invoke deliberately. No lifecycle stage runs this one on its own.

## When to use

- Landing a change whose review has passed and whose Done gate is satisfied.
- Closing a work item out in the tracker after its merge.
- Publishing documentation the merged change made current.

## When not to use

- Fixing what the Done gate reported unmet. That is `implement`.
- Learning from the finished cycle. That is `review`, which this stage offers but never runs.
- Rebasing a branch outside a merge. That is `rebase-safely` on its own.

## Workflow

Every external write is shown first and confirmed. The merge most of all. An enabled `/ff` invocation may authorize routine lifecycle writes without per-write confirmation; it never waives required human approvals, branch protection, deterministic gates, or repository red lines.

1. **Load the configuration.** Read `docs/engineering-lifecycle.md`. Absent means stop and say to run `adopt` first.
2. **Refuse a change whose Done gate has not passed.** Delegate to the `done-gate-auditor` agent and require every applicable item satisfied, **both lanes**, with judgement items decided by their configured human roles or, in enabled `/ff` mode, by the independent reviewer only when explicitly marked substitutable. Unmet means stop, list what remains, and point at `implement`. The audit runs again here, in a fresh context, rather than trusting a verdict recorded earlier: this is the Definition of Done's enforcement point, and everything before it was preparation.
3. **Check the review.** `inspect-pull-request`: approved, no unresolved blocking threads, not a draft. In `/ff` mode an independent review decision may satisfy the lifecycle's substitutable review gate, but it never substitutes for approval required by the forge or repository policy.
4. **Bring the branch up to date with the target** via `rebase-safely`, so the specifications fold into current ones rather than stale ones. This is what keeps sequential merges from conflicting.
5. **Fold the specifications** via `sync-specs`, on the branch. Where the configuration's **Provided roles** names a skill for this contract, that skill is `sync-specs`; the contract is the same either way.
6. **Archive the plan artifact** via `archive-change`, on the branch, **after** the fold, never before. The same dispatch applies.
7. **Push** the branch, so the pull request carries the complete final state.
8. **Re-audit the Done gate on the final head.** Steps 4 through 7 rebased, folded, archived and pushed new commits, so the diff the step-2 audit covered is no longer the diff that will merge. Delegate to the `done-gate-auditor` agent again, in a fresh context, and require its verdict on the final head before proceeding. An audit of an earlier commit is not evidence for this one.
9. **Re-check the review immediately before merging.** Reviewer approval can be reset by a push, and steps 4 through 7 pushed. Read the pull request's state again and, in `/ff` mode, ensure the independent review covers the final head. A vote or model decision for an earlier commit is not evidence now.
10. **Merge** via `merge-pull-request`. Set the commit message **explicitly**: the subject describes the implemented change, not the proposal the pull request opened with, and no auto-generated body is allowed to carry anything unintended onto the target branch.
11. **Verify traceability.** The branch, the commits, the pull request and the artifacts all carry the work item identifier, and the item links to the merge.
12. **Close the loop in the tracker.** `transition-work-item` to the state the mapping names, and `comment-work-item` with the merge link. In `/ff` mode, include the run ID, completion status, merged commit, reviewer model and decisions, and the durable evidence path in that comment.
13. **Publish documentation** where a pair is repository-ahead, via `sync-doc-to-kb`. A pair reported diverged is refused: both sides changed, and either write destroys work.
14. **Offer the review now.** Draft the entry from what just happened, taking effort figures from `collect-usage`, and offer it while the human is still here. Declining is one word. This is the moment attention exists, and it never blocks the merge, which has already happened. Offering is not running: `review` runs when a human accepts.

## Validation

- The Done gate was re-audited in this stage, not carried over from `implement`.
- The Done gate was re-audited **again after the final push**, on the head that will merge, not on the pre-push commit.
- The pull request was approved, not a draft, with no unresolved blocking threads, and its state was read again immediately before the merge.
- The branch was brought up to date before the specifications were folded.
- The plan was archived after the fold, never before.
- The merge commit message was set explicitly.
- The work item identifier appears on the branch, the commits, the pull request and the artifacts, and the item links to the merge.
- No diverged documentation pair was written to.
- The review was offered and not run.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Merging on a Done gate verdict recorded earlier | Re-audit here. This is the enforcement point |
| Merging on the pre-push audit after steps 4–7 pushed | Re-audit after the final push. The diff changed; the earlier verdict no longer covers it |
| Trusting the review state over the gate | The gate is a hard precondition whatever the pull request says |
| Merging a draft | Never |
| Reading approval at the start and merging at the end | Steps 4 to 7 push, which can reset approval. Read it again |
| Letting the forge auto-generate the merge body | Set it explicitly, describing the implemented change |
| Folding specifications before rebasing | They fold into stale ones, and the next merge conflicts |
| Archiving the plan before folding | Archive after, never before |
| Writing to a diverged documentation pair | Refuse. Both sides changed and either write destroys work |
| Running `review` because the merge succeeded | Offer it. A human accepts |
