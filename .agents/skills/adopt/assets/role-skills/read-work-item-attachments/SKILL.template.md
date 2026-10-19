---
name: read-work-item-attachments
description: "List a work item's attachments and retrieve their readable content. Use when requirements, designs, logs, or error details live in attached files."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: make one work item's attachments readable.

## Contract

| | |
| --- | --- |
| **Input** | A work item identifier, and optionally which attachments to fetch. |
| **Output** | Each attachment's name, type, size, and: for readable types: its content. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Every attachment is listed, including those whose content cannot be extracted.
- An attachment whose content could not be read is reported as unreadable with the reason, never omitted.

**Never**

- Download an attachment to a path the project does not ignore.
- Include attachment content in a comment or a published page without being asked.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `read-work-item-attachments` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira
- [`references/github-issues.md`](references/github-issues.md): GitHub Issues
