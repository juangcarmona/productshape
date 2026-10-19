# checkout-branch: switching safely

```bash
git status --porcelain          # must be empty, or stash on confirmation
git fetch origin
git switch <branch>             # or: git switch -c <branch> --track origin/<branch>
git worktree list               # when git refuses: it is checked out elsewhere
```

Git refuses to check out a branch already checked out in another worktree. That refusal is a feature: two checkouts of one branch is how a commit gets lost. Report which worktree holds it rather than working around it.
