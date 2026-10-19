# merge-pull-request: GitHub

```bash
gh pr merge <number> --squash --subject "<subject>" --body "<body>"
```

## Never let the body auto-generate

GitHub's default squash body concatenates every branch commit message. Anything unintended in a branch commit, a CI-skip marker especially, lands on the default branch inside that body, and GitHub scans the whole message. Pass `--subject` and `--body` explicitly. An empty `--body ""` is acceptable.

## The subject becomes history

The pull request title becomes the squash commit subject. If it still describes the proposal rather than the implementation, fix it before merging:

```bash
gh pr edit <number> --title "<subject>"
```

A title edit does not re-trigger CI. GitHub appends the pull request number itself, so never put it in the title.
