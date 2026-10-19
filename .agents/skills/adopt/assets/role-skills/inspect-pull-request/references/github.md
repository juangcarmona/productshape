# inspect-pull-request: GitHub

```bash
gh pr view <number> --json isDraft,reviewDecision,reviews,statusCheckRollup,mergeStateStatus
gh api graphql -f query='query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved isOutdated path comments(first:1){nodes{body}}}}}}}' -F owner=<owner> -F repo=<repo> -F number=<number>
```

`reviewDecision` is `APPROVED`, `CHANGES_REQUESTED`, `REVIEW_REQUIRED`, or empty when no review is required at all. Empty is not approval.

`/pulls/<number>/comments` returns individual review comments, not thread resolution state. Use the `reviewThreads` GraphQL query to establish whether any unresolved, non-outdated comment threads remain. A thread that is `isResolved` or `isOutdated` does not block the merge; one that is neither does. Count only the blocking threads before reporting merge readiness.
