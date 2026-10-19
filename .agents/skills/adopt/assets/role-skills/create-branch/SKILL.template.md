---
name: create-branch
description: "Create a working branch named by the project's convention, from a named base. Use when starting work on an item."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: create one branch for one work item, from the right base.

## Contract

| | |
| --- | --- |
| **Input** | The work item identifier, a short slug, and the base reference. |
| **Output** | The branch name created, and the base it was created from. |
| **Writes** | Creates a local branch, and pushes it where the project's convention says. |
| **Confirmation** | Confirm before pushing; local creation needs none. |

**Guarantees to the caller**

- The branch name carries the work item identifier, so branch, commits and pull request all correlate to the item.
- The base is fetched immediately before branching, so the branch starts from the true latest.
- An existing branch of that name is reported and reused, never silently recreated.

**Never**

- Branch from a stale local reference.
- Create a second branch for an item that already has one.
- Force-update an existing branch.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `create-branch` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/convention.md`](references/convention.md): naming and base conventions
