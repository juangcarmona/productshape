---
name: commit-to-sprint
description: "Commit one ready work item to the team's current sprint, carrying the fields the transition requires. Use when an item must be committed before work can start."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: commit one item to the current sprint.

## Contract

| | |
| --- | --- |
| **Input** | A work item identifier, and the estimate where the project requires one. |
| **Output** | The sprint committed to, and the fields set. |
| **Writes** | The work item's sprint, team and estimate fields. |
| **Confirmation** | **Required.** Confirm the sprint and the estimate before writing. |

**Guarantees to the caller**

- The sprint is resolved from the board's single open sprint at commit time, never hardcoded.
- An estimate is proposed by the agent and confirmed by a human, never set silently.

**Never**

- Commit several items in one invocation.
- Create or close a sprint.
- Guess an estimate the human did not confirm.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `commit-to-sprint` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira boards and sprints
- [`references/github-projects.md`](references/github-projects.md): GitHub Projects
