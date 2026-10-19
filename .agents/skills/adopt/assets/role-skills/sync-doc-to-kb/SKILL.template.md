---
name: sync-doc-to-kb
description: "Sync one mapped documentation pair in one named direction. Use when a document and its published page have drifted and one side should be brought to the other."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: bring one side of a documentation pair to the other, in a stated direction.

## Contract

| | |
| --- | --- |
| **Input** | The pair, and the direction: repository to knowledge base, or knowledge base to repository. |
| **Output** | What was written, and where. |
| **Writes** | One side of the pair. |
| **Confirmation** | **Required.** A write to a published page is visible to everyone; confirm first. |

**Guarantees to the caller**

- The direction is explicit and stated back before writing. There is no default direction.
- A pair classified as **diverged** is refused: both sides changed, and either write destroys work.
- A knowledge-base write preserves what the repository copy cannot express: embedded diagrams, macros, attachments.

**Never**

- Sync a diverged pair.
- Decide the direction on the caller's behalf.
- Publish a page containing content the human has not seen.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `sync-doc-to-kb` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/wiki.md`](references/wiki.md): a hosted wiki
- [`references/repo-docs.md`](references/repo-docs.md): Markdown in the repository
