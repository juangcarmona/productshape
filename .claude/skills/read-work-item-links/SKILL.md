---
name: read-work-item-links
description: "Return a work item's linked items with their link types, plus its parent. Use when assessing dependencies, blockers, or parent context."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: report what one work item is connected to.

## Contract

| | |
| --- | --- |
| **Input** | A work item identifier. |
| **Output** | Linked items with their link types and states, the parent or epic, and any external links. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Link direction is preserved: blocks and is-blocked-by are not the same fact, and collapsing them inverts the dependency.
- Each linked item's state is included, so a blocker already resolved is visible as resolved.

**Never**

- Follow links recursively without being asked.
- Create, change or remove a link.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `read-work-item-links` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira
- [`references/github-issues.md`](references/github-issues.md): GitHub Issues
