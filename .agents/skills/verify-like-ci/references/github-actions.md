# Deriving the check set: GitHub Actions

## Where the checks are defined

Workflows live in `.github/workflows/*.yml`. A workflow is *triggered* for a pull request when its `on:` block carries `pull_request` (and any path filters match the files this change touches). Being triggered is not the same as being *required* to gate the merge — that is a branch-protection fact the workflow file cannot express, covered below. Read every `run:` step in the jobs whose `paths:` filter matches the files this change touches: a `paths:` filter is a workflow-level (not job-level) trigger condition that means a workflow can be defined and still not run for this diff. Do not conflate "this workflow runs" with "this check gates merging"; the next section distinguishes them.

Reusable workflows (`uses: ./.github/workflows/x.yml`) and composite actions hide further `run:` steps. Follow them; the calling file alone is not the check set.

Matrix jobs multiply a single `run:` into several. The pipeline runs all of them; running one locally proves one.

## Which checks actually gate the merge

The `on:` block says how a run starts. Whether it is **required** is branch protection, which the workflow file cannot express.

```bash
gh api repos/{owner}/{repo}/branches/{branch}/protection \
  --jq '.required_status_checks.contexts'
```

A `403` means protection is not readable: on some plans it is not configured at all. Report that rather than assuming either answer.

For an existing pull request, what actually ran and its conclusion:

```bash
gh pr view <number> --json statusCheckRollup
```

Distinguish three states, and never collapse them: `SUCCESS`, a failure, and *not yet run*. An empty rollup is not a pass: a head commit with no check runs reads as "nothing failing" while proving nothing.

## Verifying the merge tree

Pull-request events build the merge commit of the head with the base, not the head alone:

```bash
git fetch origin
git rev-list --count HEAD..origin/<base>   # must be 0
```

## Mirroring the configuration

Carry over `working-directory`, the exact `run:` command, `env:` values the step depends on, and the language version pinned by `setup-*` actions. A local toolchain that differs from the pinned one produces a verdict about a different environment.
