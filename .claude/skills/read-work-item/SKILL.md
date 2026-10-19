---
name: read-work-item
description: "Read a work item by identifier into structured fields. Use when any stage needs an item's current content or state."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: return one work item's content and current state as structured fields.

## Contract

| | |
| --- | --- |
| **Input** | A work item identifier. |
| **Output** | Structured fields: identifier, title, description, state, type, assignee, labels, acceptance criteria, plus any project-specific field the lifecycle configuration names. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Every field the project's Definition of Ready references is present, or explicitly reported absent.
- The state is reported verbatim as the tracker names it, never normalised into a guess.
- An identifier that does not resolve is reported as not found, never as an empty item.

**Never**

- Modify the item.
- Infer a field the tracker did not return.
- Follow links or fetch attachments: those are separate roles.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `read-work-item` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira issues
- [`references/github-issues.md`](references/github-issues.md): GitHub Issues
