---
name: read-kb-page
description: "Fetch one knowledge-base page, preserving its structure. Use when a page must be read for context or to check documentation state."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: return one page's content with its structure intact.

## Contract

| | |
| --- | --- |
| **Input** | A page identifier, path or URL. |
| **Output** | The page's title, its content with headings, tables and links preserved, and its last-modified date. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Structure survives: headings stay headings, tables stay tables, links keep their targets.
- The last-modified date is returned, so the caller can judge whether the page is current.

**Never**

- Modify the page.
- Flatten a table into prose: the shape is usually the information.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `read-kb-page` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/wiki.md`](references/wiki.md): a hosted wiki
- [`references/repo-docs.md`](references/repo-docs.md): Markdown in the repository
