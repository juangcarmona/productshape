---
name: create-work-item
description: "Create a work item from structured input, returning its identifier and URL. Use when a shaped idea, a follow-up, or a discovered defect must become trackable."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: create one work item and return how to find it again.

## Contract

| | |
| --- | --- |
| **Input** | The item's type, title, description, and the fields the project requires at creation. |
| **Output** | The new item's identifier and URL. |
| **Writes** | Creates a work item in the tracker. |
| **Confirmation** | **Required.** Show the content and confirm before creating. |

**Guarantees to the caller**

- Every field the project requires at creation is set, or the creation is refused with the missing fields named.
- The identifier and URL are returned, so the caller never has to search for what it just made.

**Never**

- Create several items in one invocation.
- Transition the new item; that is a separate role.
- Invent a value for a required field the caller did not supply.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `create-work-item` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira
- [`references/github-issues.md`](references/github-issues.md): GitHub Issues
