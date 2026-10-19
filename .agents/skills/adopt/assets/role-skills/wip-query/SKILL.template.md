---
name: wip-query
description: "Count the work items currently in progress, excluding container types. Use at pickup, when a work-in-progress cap must be enforced."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: count what is genuinely in progress right now.

## Contract

| | |
| --- | --- |
| **Input** | Nothing beyond the project's configuration. |
| **Output** | The count of items in progress, the items themselves, and the configured cap. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Container types (epics, features, initiatives) are excluded at **every** level the project uses, not only the topmost.
- The count is of items in progress **now**, queried in this session, never carried from an earlier answer.

**Never**

- Refuse the work itself: this role reports; the stage decides.
- Count items in states the configuration does not call in-progress.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `wip-query` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/jira.md`](references/jira.md): Jira boards and sprints
- [`references/github-projects.md`](references/github-projects.md): GitHub Projects
