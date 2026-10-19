---
name: transition-work-item
description: "Apply exactly one workflow transition to one work item, chosen from those valid from its current state. Use when a stage advances an item."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: move one work item through exactly one state transition.

## Contract

| | |
| --- | --- |
| **Input** | A work item identifier, and the target state or transition name. |
| **Output** | The item's new state, and the transition actually applied. |
| **Writes** | The work item's state in the tracker. |
| **Confirmation** | **Required.** Confirm before applying. |

**Guarantees to the caller**

- The transition applied was fetched from the item's **current** state, never assumed from a mapping table.
- Exactly one transition per invocation.
- A transition unavailable from the current state is reported together with the list of what is available.

**Never**

- Chain several transitions to reach a target state.
- Fire a transition the lifecycle configuration marks human-only.
- Reverse a human-only transition found already applied: report it as a signal instead.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `transition-work-item` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira workflows
- [`references/github-issues.md`](references/github-issues.md): GitHub labels and Projects
