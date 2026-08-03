# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It holds the release intents for the `@prodshape/*` packages.

## When you change a published package

Add a changeset describing the change and the version bump it warrants:

```bash
pnpm changeset
```

Pick the affected packages and the bump type (`patch` / `minor` / `major`) and write a short, user-facing summary. Commit the generated `.changeset/*.md` file with your change.

Only packages that receive a changeset are versioned and published. See [`RELEASING.md`](../RELEASING.md) for the full release process, pre-release (alpha/beta) tracks and rollback.
