# transition-work-item: GitHub Issues

The lifecycle state is not GitHub's `state`. Under the shared defaults it is exactly one `status:*` label; ordinary adoption records the verified mapping if the repository uses another store.

## Labels

```bash
# Read the current state labels first and validate the configured transition
gh issue view <number> --json labels --jq '.labels[].name | select(startswith("status:"))'

# Only then apply the transition
gh issue edit <number> --remove-label "status:<from>" --add-label "status:<to>"
```

Read and validate the current state immediately before applying the label change. If the issue has moved, carries zero or multiple current state labels, or the requested transition is not allowed by `docs/engineering-lifecycle.md`, report the mismatch and stop. Remove the old status label and add the new one in the same call. Reread the issue and verify exactly one `status:*` label remains.

## Projects single-select

```bash
gh project item-edit --id <item-id> --field-id <field-id> \
   --project-id <project-id> --single-select-option-id <option-id>
```

All four identifiers are per-project and are resolved during adoption.

## Closing

Closing an issue is a separate act from reaching a terminal lifecycle state. Do both only where the project's mapping says the terminal state means closed.
