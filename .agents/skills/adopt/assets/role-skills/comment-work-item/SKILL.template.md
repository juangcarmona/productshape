---
name: comment-work-item
description: "Add a formatted comment to a work item. Use when posting a summary, a question, an outcome, or a link back to the item."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: post one comment on one work item.

## Contract

| | |
| --- | --- |
| **Input** | A work item identifier and the comment body. |
| **Output** | The comment's identifier or URL. |
| **Writes** | Adds a comment in the tracker. |
| **Confirmation** | **Required.** Show the comment and confirm before posting. |

**Guarantees to the caller**

- The comment is posted once. A retry after an ambiguous failure checks for an existing identical comment first.
- Formatting is rendered in the tracker's own markup, not pasted as raw text.

**Never**

- Edit or delete an existing comment.
- Post the same summary on every stage: a comment nobody reads is noise that trains people to ignore the ones that matter.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `comment-work-item` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira
- [`references/github-issues.md`](references/github-issues.md): GitHub Issues
