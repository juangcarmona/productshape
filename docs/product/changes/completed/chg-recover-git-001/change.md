---
id: CHG-RECOVER-GIT-001
type: product-change
title: Opt-in git checkpoint discipline for recovery sessions
status: applied
base-revision: '6ae0dda'
operations:
  add: []
  modify:
    - FR-RECOVER-001
  remove: []
---

## Problem

FR-RECOVER-001 forbids the recovery tooling from committing anything. The rule exists to keep tooling from accepting recovered knowledge, but as written it also forbids checkpoint commits of the session's own output on a dedicated working branch. The first external recovery run showed what that costs: 79 files of uncommitted working tree on the default branch, no per-step audit trail, and undoing the experiment meant hand-picking restores instead of deleting a branch.

## Intended Product Outcome

A recovery brief can declare a dedicated recovery branch. When it does, the session starts on that branch (refusing to start over modified tracked files) and every state-mutating recovery command records a checkpoint commit of the session's output, under a fixed message convention. Without the declaration the tool never touches version control. Apply, merge, push and acceptance remain forbidden to tooling exactly as before.

## Rationale

The doctrine the old clause protected is acceptance by humans, not the absence of commits. A checkpoint commit on a declared working branch accepts nothing: the model stays untouched, the change stays a draft, and the branch is disposable. What the checkpoints buy is auditability (the session reads as steps), safe interruption (the working tree matches persisted session state at every boundary) and cheap reproduction (delete the branch, run again). Making the discipline opt-in through the brief keeps repositories that want no tool-driven commits exactly where they were.

## Affected Product Areas

Brownfield recovery sessions: how their working-tree output is checkpointed while the session runs. Nothing changes for the change lifecycle, apply, or acceptance.

## Open Questions

None.

## Product Acceptance

The overlay validates without errors, and a human accepts the amended requirement by merging the pull request that carries this change applied.

## Out of Scope

Committing on behalf of any other command; pushing; opening pull requests; any default-on behaviour.
