---
name: search-kb
description: "Search the project's knowledge base and return ranked pages with excerpts. Use when looking for existing documentation about a feature, system or topic."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: find the pages in the knowledge base that bear on a topic.

## Contract

| | |
| --- | --- |
| **Input** | A search term or a structured query. |
| **Output** | Ranked results: page title, identifier or path, and an excerpt showing why it matched. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Results carry an excerpt, so relevance can be judged without opening every page.
- An empty result is reported as empty, never padded with near-misses presented as matches.

**Never**

- Open or fetch each result in full; that is a separate role, and doing it here floods the caller's context.
- Rank by recency alone; a stale page that matches is still evidence.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `search-kb` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/wiki.md`](references/wiki.md): a hosted wiki
- [`references/repo-docs.md`](references/repo-docs.md): Markdown in the repository
