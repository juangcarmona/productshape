# The configuration contract

`adopt` writes [`../assets/engineering-lifecycle.md`](../assets/engineering-lifecycle.md) into the adopting repository as `docs/engineering-lifecycle.md`. This reference documents the contract that file satisfies. Load it when writing the configuration in bootstrap mode, or when reconciling an existing one.

## The headings are the interface

Every capability locates what it needs by heading, so headings may not be renamed, reordered out of existence, or removed, even when a section is empty. Sections may be added freely.

| Section | Read by |
|---|---|
| Definition of Ready | `refine-to-ready`, `refine`, `status` |
| Definition of Done | `verify-done`, `propose`, `implement`, `integrate`, `status` |
| Lifecycle stages and states | every stage capability, `status` |
| Label conventions | `adopt`, `refine`, `propose`, `implement`, `integrate`, `review`, `status`, `ff` |
| Fast Forward | `ff`, `status`, and every stage invoked by `ff` |
| Work item fields | the transition and update role capabilities |
| Work in progress | `propose`, `implement` |
| Roles | `verify-done`, `implement`, `integrate` |
| Installed roles | `status`, `adopt` in reconcile mode |
| Provided roles | `propose`, `implement`, `integrate` (plan-artifact dispatch), `adopt` in reconcile mode |
| Amendment log | `adopt` in reconcile mode, `review` |

## Rules for the written file

- **Replace every `<placeholder>`.** A placeholder left in a merged configuration is a value nobody resolved, and every capability downstream will trust it.
- **Delete the guidance note at the top** once the file is adopted. It is addressed to whoever is adopting, not to the project.
- **Resolve every identifier from live tooling** in the adoption session. A transition id transcribed from a diagram or from memory breaks the loop a month later, and the failure will look like something else entirely.
- **Mark inapplicable dimensions `N/A` with a one-line reason** rather than deleting the row. A dropped row reads as an oversight; an `N/A` with a reason reads as a decision.
- **Judgement items must name a role** that appears in the Roles section.
- **Provided roles must carry names resolved from live tooling.** A plan-artifact contract whose provider name was transcribed from memory breaks dispatch the first time a stage needs it, and the failure will look like a missing skill rather than a stale record.
- **Fast Forward is opt-in and fail-closed.** The executor and reviewer models must be resolved by the active harness and differ. A harness that cannot select and attest both models cannot run Fast Forward.
- **Fast Forward invocation is explicit authorization for routine writes** performed by its composed stages and adapted role skills. Standalone confirmation rules still apply outside Fast Forward. This authorization never substitutes for a human decision explicitly required by the repository or forge, never approves on a user's behalf, and never overrides protected branches or red lines.
- **A second adoption pass is a no-op when the configuration, labels, conventions, and installed roles already conform.** Preserve repository-specific decisions and label usage.

## Absence is a hard stop

If `docs/engineering-lifecycle.md` is absent, every lifecycle capability stops and says to run `adopt` first. None may guess a team's workflow. That is why bootstrap mode exists and why no capability carries a fallback checklist.

## The project owns this file

Once bootstrap has run, the configuration belongs to the project. Reconcile mode works against what the project has made of it: it proposes changes as diffs, preserves customisation, and appends to the Amendment log. It never regenerates the file from the template.
