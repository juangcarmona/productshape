---
name: apply-change
description: "Work through the plan artifact's tasks, keeping the artifact and the code in step. Use during implementation."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: execute the plan's tasks and keep the artifact honest about what is done.

## Contract

| | |
| --- | --- |
| **Input** | The plan artifact. |
| **Output** | The tasks completed, and any deviation from the plan. |
| **Writes** | The code, and the plan artifact's task state. |
| **Confirmation** | Confirm before committing. |

**Guarantees to the caller**

- A deviation from the plan surfaces **immediately**, not at the end.
- The task list reflects the actual diff: reconciled deliberately, not ticked off by memory.

**Never**

- Silently drop a task.
- Mark a task done that the diff does not support.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `apply-change` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/openspec.md`](references/openspec.md): the OpenSpec CLI
- [`references/authored.md`](references/authored.md): a project's own format
