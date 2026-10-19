---
name: sync-specs
description: "Fold the change's specification deltas into the project's specifications. Use at close-out, before the merge."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: make the project's specifications describe the world after this change.

## Contract

| | |
| --- | --- |
| **Input** | The plan artifact and the project's specifications. |
| **Output** | The specifications updated, and what changed in them. |
| **Writes** | The project's specification files. |
| **Confirmation** | Confirm before committing. |

**Guarantees to the caller**

- Folding happens on a branch that is already up to date with the target, so deltas fold into current specifications rather than stale ones.
- The specification and the implemented change agree when this finishes.

**Never**

- Fold into a stale branch.
- Merge anything.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `sync-specs` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/openspec.md`](references/openspec.md): the OpenSpec CLI
- [`references/authored.md`](references/authored.md): a project's own format
