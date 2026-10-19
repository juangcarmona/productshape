---
name: checkout-branch
description: "Switch the working copy to a branch, fetching when needed, refusing when uncommitted changes would be lost. Use when resuming work on an item."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: move the working copy to a branch without losing anything.

## Contract

| | |
| --- | --- |
| **Input** | A branch name. |
| **Output** | The branch now checked out, and whether it was fetched. |
| **Writes** | The working copy's checked-out branch. |
| **Confirmation** | Confirm when uncommitted changes must be stashed. |

**Guarantees to the caller**

- Uncommitted changes are never discarded. The switch is refused, or the changes are stashed on explicit confirmation.
- A branch that exists only on the remote is fetched and tracked, not reported missing.

**Never**

- Discard, reset, or clean the working tree.
- Check out a branch already checked out in another worktree: report where it is instead.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `checkout-branch` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/convention.md`](references/convention.md): switching safely
