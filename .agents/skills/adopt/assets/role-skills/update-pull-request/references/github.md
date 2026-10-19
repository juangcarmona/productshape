# update-pull-request: GitHub

```bash
gh pr edit <number> --title "<title>" --body-file <path>
gh pr ready <number>
```

`gh pr ready` un-drafts the pull request. It does **not** universally trigger workflows configured for the default `pull_request` activity: only workflows whose `on:` block includes the `ready_for_review` activity run because of this change, and many workflows may already have run while the pull request was a draft. Do not assume CI was started by `gh pr ready`; read the check state to confirm what ran. A title edit does not re-trigger CI, which makes it safe immediately before a merge.
