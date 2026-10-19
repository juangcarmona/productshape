# inspect-ci-result: GitHub Actions

```bash
gh pr view <number> --json statusCheckRollup
gh run list --branch <branch> --commit <head-sha> --limit 5
gh run view <run-id> --log-failed
```

Always query by the exact head SHA (or the pull request's merge ref), never by branch name alone. `gh run list --branch <branch>` returns the most recent runs on that branch regardless of commit, so an older green run can satisfy a check that the current revision never produced. Reject any run whose `headSha` is not the revision under review.

## What gates the merge

```bash
gh api repos/{owner}/{repo}/branches/{branch}/protection \
  --jq '.required_status_checks.contexts'
```

A `403` means protection is not readable: on some plans it is not configured at all. Report that, rather than assuming either answer.

## The empty-rollup trap

A head commit with **no check runs** returns an empty rollup, which reads as "nothing failing" while proving nothing. This happens after a push whose commit message carries a CI-skip marker. An empty rollup is *no result*, never a pass.
