---
name: inspect-pull-request
description: "Return a pull request's review state: status, reviewer votes, comment threads, merge readiness. Use when checking whether a pull request is approved or why it cannot merge."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: report where one pull request stands with its reviewers.

## Contract

| | |
| --- | --- |
| **Input** | A pull request identifier. |
| **Output** | Draft state, reviewer votes, unresolved comment threads, required-check status, and merge readiness. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Approval is reported as of **now**, not as of an earlier read: votes reset when new commits land.
- Unresolved threads are listed with their content, so the caller knows what is actually blocking.

**Never**

- Approve, vote, or resolve a thread.
- Report a draft pull request as merge-ready.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `inspect-pull-request` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/azure-devops.md`](references/azure-devops.md): Azure DevOps Repos
- [`references/github.md`](references/github.md): GitHub
