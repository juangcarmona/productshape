---
name: open-pull-request
description: "Open a pull request from the current branch, linked to its work item. Use when a stage needs a pull request raised, in draft or ready for review."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: create one pull request for the current branch and link it to its work item.

## Contract

| | |
| --- | --- |
| **Input** | The source branch, the target branch, a title, a body, and whether it opens as a draft. |
| **Output** | The pull request's identifier and URL, and its draft state. |
| **Writes** | Creates a pull request in the forge. |
| **Confirmation** | **Required.** Confirm before creating. |

**Guarantees to the caller**

- Exactly one pull request per work item: an existing open one is reported and reused, never duplicated.
- The work item identifier appears in the title or body, so the item and the change are traceable to each other.
- The draft state is exactly as the caller asked; a stage that wants a review gate gets an unmergeable draft.

**Never**

- Open a second pull request for an item that already has one.
- Mark a pull request ready for review; that is a separate role.
- Add reviewers the project's configuration does not name.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `open-pull-request` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/azure-devops.md`](references/azure-devops.md): Azure DevOps Repos
- [`references/github.md`](references/github.md): GitHub
