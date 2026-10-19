---
name: classify-doc-drift
description: "Classify each mapped documentation pair as in sync, repo ahead, wiki ahead, diverged, or unmapped, without changing either side. Use before trusting a page, or after either side has been edited."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: say which side of a documentation pair is ahead, and by how much.

## Contract

| | |
| --- | --- |
| **Input** | The project's documentation mapping; which repository file corresponds to which page. Optionally a previously recorded sync baseline (last-sync revision, hash, or timestamp per side). |
| **Output** | Per pair: in sync, repo ahead, knowledge base ahead, diverged, or unmapped: with the evidence for the verdict. Where no sync baseline exists and current content alone cannot distinguish `repo ahead` from `diverged`, report `unknown` for that pair rather than guessing. |
| **Writes** | Nothing. Read-only. (A sync baseline may be *read*; it is never written here. Persisting one is the sync capability's act.) |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- **Diverged** is reported as its own verdict, never collapsed into one side being ahead: both changed, and no automatic sync is safe.
- **Unknown** is reported where a sync baseline is absent and current content cannot distinguish one side being ahead from both having diverged. Current dates and content can show that copies differ, but cannot establish which side moved without a baseline. Reporting `unknown` is safer than classifying `repo ahead` and letting `integrate` overwrite the other side.
- An unmapped file or page is reported rather than ignored.

**Never**

- Perform the sync.
- Pick a winner. Choosing which side wins is a human decision.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `classify-doc-drift` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/wiki.md`](references/wiki.md): a hosted wiki
- [`references/repo-docs.md`](references/repo-docs.md): Markdown in the repository
