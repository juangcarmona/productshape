---
name: inspect-ci-result
description: "Return the continuous integration result for a branch or pull request: outcome, failing job, and log excerpts. Use when checking whether CI passed or diagnosing why it did not."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: report what CI actually did for a branch or pull request.

## Contract

| | |
| --- | --- |
| **Input** | A branch name or a pull request identifier. |
| **Output** | Per required check: its name, conclusion, and: where it failed: the failing job and a log excerpt. Plus one overall verdict. |
| **Writes** | Nothing. Read-only. |
| **Confirmation** | Not required, no external write. |

**Guarantees to the caller**

- Three states are distinguished and never collapsed: passed, failed, and **not yet run**.
- A check with no run for the current head is reported as having no result, never as passing.
- The set of checks reported is the set the branch protection **requires**, not merely those that happen to have run.

**Never**

- Treat a queued or in-progress run as a passing one.
- Report an empty result set as success, no checks having run is not the same as nothing failing.
- Re-run or cancel anything.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `inspect-ci-result` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/azure-devops.md`](references/azure-devops.md): Azure Pipelines
- [`references/github.md`](references/github.md): GitHub Actions
