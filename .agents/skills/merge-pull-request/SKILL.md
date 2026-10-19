---
name: merge-pull-request
description: "Complete an approved pull request into its target branch. Use at close-out, once the Done gate has passed and the review is approved."
---

> **Template.** The `adopt` capability adapts this into a role capability the project owns. Adapt *how* the role is performed; never change *what* it guarantees to its callers.

One responsibility: merge one approved pull request, composing the commit message that lands on the target branch.

## Contract

| | |
| --- | --- |
| **Input** | A pull request identifier, the merge strategy, and the subject and body for the resulting commit. |
| **Output** | The merge commit's identifier and the pull request's final state. |
| **Writes** | Merges into the target branch and, where configured, deletes the source branch. |
| **Confirmation** | **Required** in normal use. An enabled `/ff` invocation supplies confirmation for this merge only when the lifecycle configuration authorizes it and the forge's protection rules are satisfied. |

**Guarantees to the caller**

- The pull request was still open and still approved immediately before the merge, re-checked rather than assumed. In `/ff` mode, a recorded independent reviewer decision may satisfy the lifecycle approval only where the forge does not require a human approval.
- The commit subject describes the **implemented change**, not the proposal the pull request opened with.
- The message is set explicitly, so no auto-generated body carries anything unintended onto the target branch.

**Never**

- Merge a draft pull request.
- Merge a pull request whose required checks have not passed.
- Cast an approval on the author's behalf. The `/ff` decision is recorded as an independent lifecycle review, never forged as a human vote.
- Let the forge auto-generate the squash body.

## Adapting this template

1. Pick the reference below matching this project's tooling.
2. Replace every `<placeholder>` with a value **resolved from live tooling in the adoption session**: an identifier transcribed from a diagram or from memory breaks the loop a month later.
3. Keep the contract above intact. A command calling `merge-pull-request` must get the same shape back on every stack.
4. No reference matches → author against the contract and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## References

- [`references/azure-devops.md`](references/azure-devops.md): Azure DevOps Repos
- [`references/github.md`](references/github.md): GitHub

## Fast Forward authorization

When called inside an enabled Fast Forward run, the invocation authorizes this role's routine lifecycle write without per-write confirmation. Re-read the configured state immediately before writing and verify the result afterward. Stop at a human-only decision, required human approval, protected forge rule, deployment, or repository red line.
