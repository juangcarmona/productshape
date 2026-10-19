---
name: update-work-item
description: "Update fields of an existing work item, changing only the fields supplied. Use when recording shaped requirements or correcting content."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: change named fields on one work item and nothing else.

## Contract

| | |
| --- | --- |
| **Input** | A work item identifier and the fields to change. |
| **Output** | The fields actually changed, with their new values. |
| **Writes** | The work item's fields in the tracker. |
| **Confirmation** | **Required.** Show the diff and confirm before writing. |

**Guarantees to the caller**

- Only the fields supplied are touched. Every other field is left byte-identical.
- The change is reported field by field, so the caller can see what moved.

**Never**

- Change the item's state; that is a separate role.
- Clear a field because the caller omitted it.
- Reformat a field it was not asked to change.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `update-work-item` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira
- [`references/github-issues.md`](references/github-issues.md): GitHub Issues
