---
name: archive-change
description: "Archive a completed change's plan artifact. Use at close-out, once its specifications have been folded in."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: retire one completed plan artifact into the project's archive.

## Contract

| | |
| --- | --- |
| **Input** | The plan artifact. |
| **Output** | Its archived location. |
| **Writes** | Moves the plan artifact. |
| **Confirmation** | Confirm before committing. |

**Guarantees to the caller**

- Archiving happens **after** the specifications are folded in, never before.
- The archived artifact stays readable: it is the record of why the change was made.

**Never**

- Delete the artifact.
- Archive a change whose specifications have not been folded in.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `archive-change` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/openspec.md`](references/openspec.md): the OpenSpec CLI
- [`references/authored.md`](references/authored.md): a project's own format
