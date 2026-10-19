---
name: propose-change
description: "Create the plan artifact for a work item. Use when a ready item needs its solution designed and written down."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: produce the plan artifact this project reviews at the Planned gate.

## Contract

| | |
| --- | --- |
| **Input** | A work item and the analysis from refinement. |
| **Output** | The plan artifact's location, and a summary of what it proposes. |
| **Writes** | Creates the plan artifact on the branch. |
| **Confirmation** | Confirm before committing. |

**Guarantees to the caller**

- The artifact carries all four parts: proposal, design, tasks, and test plan.
- The test plan names which Definition of Done items the change will have to satisfy.
- The work item identifier appears in the artifact, so plan and item stay correlated.

**Never**

- Implement anything.
- Open the pull request: a separate role.
- Leave the test plan for later; it is what the Planned gate reviews.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `propose-change` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/openspec.md`](references/openspec.md): the OpenSpec CLI
- [`references/authored.md`](references/authored.md): a project's own format
