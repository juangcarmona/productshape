# merge-pull-request: Azure DevOps

## Re-check immediately before merging

Reviewer votes reset when a new commit is pushed. A vote read minutes ago may no longer exist. Re-read the PR's state as the last act before merging.

## Auto-complete

Setting auto-complete with a squash strategy lets the merge fire when the last policy passes. Set the squash commit message **explicitly** at the same time: what lands on the target branch is what you set here.

## Branch deletion

Delete the source branch on merge where the project's convention says so. A branch kept after merge is a branch someone eventually pushes to.
