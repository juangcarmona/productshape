---
name: update-pull-request
description: "Update an existing pull request in place (title, description, reviewers, draft state), never creating a duplicate. Use when a pull request needs a refreshed summary or must be marked ready for review."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: change one existing pull request in place.

## Contract

| | |
| --- | --- |
| **Input** | A pull request identifier and the properties to change. |
| **Output** | The properties actually changed. |
| **Writes** | The pull request in the forge. |
| **Confirmation** | **Required.** Confirm before writing. |

**Guarantees to the caller**

- The existing pull request is updated. A duplicate is never created, whatever the caller asked for.
- Marking ready for review is reported explicitly, because it starts the review gate and notifies people.

**Never**

- Create a pull request.
- Merge one.
- Silently drop a description section the project's template requires.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `update-pull-request` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/azure-devops.md`](references/azure-devops.md): Azure DevOps Repos
- [`references/github.md`](references/github.md): GitHub
