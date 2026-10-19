# open-pull-request: Azure DevOps

Prefer the project's Azure DevOps tooling over the CLI where both are available; the CLI's PR verbs are the fallback.

## Check for an existing one first

Query open pull requests for the source branch before creating. A duplicate pull request splits the review and the history, and the second one is invisible to whoever is watching the first.

## Draft

A draft pull request is created with `isDraft: true`. Draft state is the review gate's mechanism: it cannot be completed, and PR validation does not run on it. Raise the plan's pull request as a draft deliberately.

## Linking

Put the work item identifier in the title so it survives into the squash commit subject, and link the item as a PR work-item link where the project connects the two systems.
