# Engineering lifecycle

> **Adopting this template**: this file is your project's lifecycle contract. Every capability reads it; none hardcodes your answers. Its section headings are the interface, so add sections freely but never rename or delete one, even when it is empty. Replace every `<placeholder>` with a value resolved from your live tooling, and delete this note when you are done. The full contract is documented in the plugin's `references/configuration-contract.md`.

**Project**: `<project or repository name>` **Adopted**: `<YYYY-MM-DD>` · **Last amended**: `<YYYY-MM-DD>`

## Definition of Ready

Governs the **Ready** gate at the end of the `refine` capability: *is the problem sufficiently defined?* Verified semantically by an agent, which alerts a human when a dimension is missing, vague or contradictory rather than refusing outright.

An item is ready when every applicable dimension is present. Inapplicable ones are marked `N/A` with a one-line reason.

| # | Dimension | This project requires |
| --- | --- | --- |
| 1 | Title | `<kept as written / adapted: … / dropped: reason>` |
| 2 | Description | `<…>` |
| 3 | Actor / stakeholder | `<…>` |
| 4 | Priority | `<…>` |
| 5 | Dependencies | `<…>` |
| 6 | Acceptance criteria | `<…>` |
| 7 | Scope | `<…>` |
| 8 | Product rules | `<…>` |
| 9 | Affected behaviour | `<…>` |
| 10 | Quality expectations | `<…>` |
| 11 | Test impact | `<…>` |
| 12 | Existing decisions | `<…>` |
| 13 | Unknowns / risks | `<…>` |

### Additional to this project

*From adopt's closing question. Examples other teams gave: an investment category, a UX design link, a data classification, customer approval.*

| Dimension | This project requires |
| --- | --- |
| `<name>` | `<…>` |

## Definition of Done

Governs the **Done** gate at the end of the `implement` capability: *is the resulting change sufficiently verified?* the `integrate` capability refuses to merge a change that has not passed it.

**In this project, "done" means**: `<finished and proven, ready to integrate / deployed to production / …>`

Lane is `deterministic` (an agent or CI settles it), `judgement` (a named role decides), or `both`. Judgement items must name a role from the **Roles** section.

| # | Dimension | This project requires | Lane | Role |
| --- | --- | --- | --- | --- |
| 1 | Acceptance criteria | `<…>` | `<lane>` | `<role or none>` |
| 2 | Implementation completeness | `<…>` | `<lane>` | `<…>` |
| 3 | Tests | `<…>` | `<lane>` | `<…>` |
| 4 | Quality checks | `<…>` | `<lane>` | `<…>` |
| 5 | Security | `<…>` | `<lane>` | `<…>` |
| 6 | Architecture / design conformance | `<…>` | `<lane>` | `<…>` |
| 7 | Documentation | `<…>` | `<lane>` | `<…>` |
| 8 | Product / spec consistency | `<…>` | `<lane>` | `<…>` |
| 9 | Evidence | `<…>` | `<lane>` | `<…>` |
| 10 | Human review | `<…>` | `judgement` | `<…>` |
| 11 | Known limitations | `<…>` | `<lane>` | `<…>` |

### Additional to this project

| Dimension | This project requires | Lane | Role |
| --- | --- | --- | --- |
| `<name>` | `<…>` | `<lane>` | `<…>` |

### Deterministic checks

The commands that produce the deterministic lane's evidence. `verify-like-ci` derives these from the project's pipeline configuration rather than from this list; the list records what the team expects to see, so a silent disappearance is noticed.

| Check | How it runs | Evidence it produces |
| --- | --- | --- |
| `<build>` | `<command>` | `<…>` |
| `<tests>` | `<command>` | `<…>` |

## Lifecycle stages and states

How the loop's stages map onto this project's work-item states. For GitHub, `adopt defaults` uses the canonical `status:*` labels in [`github-label-standard.md`](../references/github-label-standard.md); ordinary adoption maps the same semantics to the live tracker. Every provider-specific value is resolved from live tooling during adoption.

| Stage | State on entry | State on exit | Transition | Fired by |
| --- | --- | --- | --- | --- |
| `refine` | `status:backlog` | `status:ready` | Set Ready after the gate passes | `refine` |
| `propose` | `status:ready` | `status:proposed` | Set after the proposal passes its review gate | `propose` |
| `implement` | `status:proposed` | `status:in-progress` → `status:in-review` | Set `in-progress` on entry; set `in-review` when the Done gate passes and the PR is ready | `implement` |
| `integrate` | `status:in-review` | `status:done`, issue closed | Merge the linked PR; verify GitHub closes the issue, then set `status:done` | `integrate` |
| `review` | `status:done` | `status:done` | Create the per-item retrospective; no status transition | `review` |

### Transitions no capability ever fires

*Blocked, rejected, reopened, deprioritised, escalated. A capability reports finding one of these; it never fires one and never reverses one.*

| Transition | Meaning | Who fires it |
| --- | --- | --- |
| `<…>` | `<…>` | human only |

## Label conventions

Use the shared label vocabulary from the installed `adopt` capability. Record this repository's provider, label store, exact labels or mapped states, and repository-specific exceptions here. Do not rename or repurpose labels with existing usage. Use `Not applicable` when this repository does not use labels for lifecycle state.

| Concern | This project uses |
| --- | --- |
| Provider and state store | `<GitHub labels / other live-resolved mechanism / Not applicable>` |
| Canonical lifecycle statuses | `status:backlog`, `status:ready`, `status:proposed`, `status:in-progress`, `status:in-review`, `status:done` or verified provider mapping |
| Optional overlays | `blocked`, `owner-review`, only when used |
| Optional labels adopted and why | `<…>` |
| Issue and pull request conventions | `<paths, required fields, or Not applicable>` |
| Per-item review record | `docs/reviews/issue-<number>.md`, one file per work item |
| Retrospective baseline date | `<adoption date; earlier merges are historical and excluded from review debt>` |
| Process ledger and conflict practice | `<existing path and format for cross-item lessons, or Not used>` |

## Fast Forward

Fast Forward is opt-in. It may run only stages and gates already configured above, using the stage capabilities as the implementation of each step. It never waives deterministic checks or forge/repository protection.

| Setting | This project requires |
| --- | --- |
| Enabled | `yes` when the harness can select and attest an independent reviewer; otherwise `no` with the reason |
| Executor model | Resolve from the active harness at run time |
| Independent review model | Select a different model through the active harness for each run |
| Maximum correction rounds per gate | `3` |
| Substitutable judgement items | `none` by default; list item IDs and rationale only when the repository explicitly authorizes substitution |
| Durable evidence location and format | `docs/delivery/ff/<work-item-id>/<run-id>/run.json` and `summary.md` |
| Human-only or protected gates that stop automation | Product-scope and accepted-decision changes, forge-required human approvals, deployments, and repository red lines; `/ff` may merge only when every configured gate and protection rule passes |

## Work item fields

Fields a transition's screen requires, with their identifiers. Send all of them and read the error rather than trusting a `required` flag: transition screens are known to under-report.

| Field | Identifier | Required by | Notes |
| --- | --- | --- | --- |
| `<…>` | `<…>` | `<transition>` | `<format, e.g. rich text needs structured markup>` |

## Work in progress

*Optional. Agile does not imply Scrum: a team with no WIP cap and no sprints writes "Not used" here, and no sprint or WIP role capability is installed.*

**WIP cap**: `<N / Not used>` **Query used at pickup**: `<…>` **Sprint commitment**: `<transition and field ids / Not used>` **Board**: `<url: column limits are set by hand; no tool reaches board configuration>`

## Roles

Who decides the judgement items above. A role is a person, a team, or a named responsibility, not a job title for its own sake.

| Role | Who | Decides |
| --- | --- | --- |
| `<…>` | `<…>` | `<which Definition of Done dimensions>` |

## Installed roles

Role capabilities the `adopt` capability installed into `.agents/skills/`, the source this project owns. Reconcile works against this list rather than overwriting blind.

Copies in other harness directories (`.claude/skills/`, …) are generated from that source; edit the source, never a copy.

## Provided roles

Role capabilities a specification tool generates under its own names, which adoption deliberately does not install. The lifecycle stages dispatch on this table: where a contract below has an entry, the stage delegates to that skill instead of looking for an installed one. Every name is resolved from live tooling in the adoption session — never transcribed from memory or a diagram.

| Contract | Provided by | Skill to invoke |
| --- | --- | --- |
| `propose-change` | `<openspec init / …>` | `<live-resolved skill name>` |
| `apply-change` | `<…>` | `<…>` |
| `sync-specs` | `<…>` | `<…>` |
| `archive-change` | `<…>` | `<…>` |

A contract with no provider and no installed role is a gap: name it in reconcile rather than leaving the stage to fail on a role that does not exist.

| Role skill | Adapted from | Installed | Projected to |
| --- | --- | --- | --- |
| `<read-work-item>` | `<reference or authored>` | `<YYYY-MM-DD>` | `<harnesses>` |

## Amendment log

the `review` capability proposes changes to this file from delivery evidence. Every amendment is shown as a diff and confirmed by a human; nothing edits this file silently.

| Date | Section | Change | Why |
| --- | --- | --- | --- |
| `<YYYY-MM-DD>` | `<…>` | `<…>` | `<the evidence that prompted it>` |
