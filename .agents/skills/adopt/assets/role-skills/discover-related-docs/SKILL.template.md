---
name: discover-related-docs
description: "Find the knowledge-base pages relevant to a piece of work from its context. Use when gathering documentation for an item or checking which docs a change touches."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: decide which pages bear on this piece of work.

## Contract

| | |
| --- | --- |
| **Input** | A work item's summary, components, and the systems it touches. |
| **Output** | A ranked list of candidate pages with a one-line reason for each. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Each candidate carries **why** it is a candidate, so the caller can discard a bad guess cheaply.
- Finding nothing relevant is a valid result and is reported as such.

**Never**

- Fetch each candidate in full.
- Present a guess as a confirmed relationship.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `discover-related-docs` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/wiki.md`](references/wiki.md): a hosted wiki
- [`references/repo-docs.md`](references/repo-docs.md): Markdown in the repository
