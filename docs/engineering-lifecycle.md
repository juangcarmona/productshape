# Engineering lifecycle

**Project**: ProductShape · **Adopted**: 2026-10-18 · **Last amended**: 2026-10-19

## Definition of Ready

An item is ready when each applicable dimension is explicit enough to plan. Mark an inapplicable dimension `N/A` and give the reason. Priority is not a readiness requirement.

| # | Dimension | This project requires |
| --- | --- | --- |
| 1 | Title | State the desired outcome, not the activity. |
| 2 | Description | Explain intent, problem, and relevant context. |
| 3 | Actor / stakeholder | Identify who is affected when relevant; otherwise mark N/A with a reason. |
| 4 | Priority | Optional; no priority field is required before Ready. |
| 5 | Dependencies | List known dependencies or explicitly state none. |
| 6 | Acceptance criteria | Define observable, verifiable conditions for success. |
| 7 | Scope | Always state what is in scope and out of scope. |
| 8 | Product rules | Identify applicable rules in `docs/product/model/` and corresponding OpenSpec requirements. |
| 9 | Affected behaviour | Identify existing product flows or capabilities that may change, when applicable. |
| 10 | Quality expectations | Name relevant quality needs such as accessibility, reliability, security, or performance. |
| 11 | Test impact | Identify affected or new automated and E2E scenarios; leave the detailed test plan to `propose`. |
| 12 | Existing decisions | Inspect relevant OpenSpec specs, product artifacts, and `docs/architecture/decisions/`; link applicable decisions. |
| 13 | Unknowns / risks | Resolve material uncertainty or explicitly record it. |

### Additional to this project

No additional Ready dimensions.

| Dimension | This project requires |
| --------- | --------------------- |

## Definition of Done

**In this project, "done" means**: the change is finished and proven, ready to integrate after the required maintainer review.

| # | Dimension | This project requires | Lane | Role |
| --- | --- | --- | --- | --- |
| 1 | Acceptance criteria | Every criterion has deterministic evidence where automatable, and a reviewer judges the rest. | both | Repository Maintainer |
| 2 | Implementation completeness | Complete every planned task or explicitly drop it with a reason; the maintainer checks for silent scope loss. | both | Repository Maintainer |
| 3 | Tests | CI tests and runtime conformance checks pass; the maintainer judges whether coverage addresses the change's risk. | both | Repository Maintainer |
| 4 | Quality checks | All blocking checks listed under Deterministic checks pass. | deterministic | none |
| 5 | Security | Repository Maintainer reviews security-sensitive changes when relevant; no automated security gate is currently configured. | judgement | Repository Maintainer |
| 6 | Architecture / design conformance | Repository Maintainer checks conformance to the approved OpenSpec design and relevant ADRs; record deviations. | judgement | Repository Maintainer |
| 7 | Documentation | Update user/developer documentation and changelog when observable behaviour or shipped interfaces change; maintainer checks completeness. | both | Repository Maintainer |
| 8 | Product / spec consistency | CI model validation and OpenSpec citation checks pass; Product Engineer reviews changes to product behaviour. | both | Product Engineer |
| 9 | Evidence | Link the passing CI run and required runtime or visual evidence in the pull request. | deterministic | none |
| 10 | Human review | Repository Maintainer approval is required before merge. | judgement | Repository Maintainer |
| 11 | Known limitations | Record unresolved limitations on the issue or pull request; maintainer confirms they are explicit. | both | Repository Maintainer |

### Additional to this project

No additional Done dimensions.

| Dimension | This project requires | Lane | Role |
| --------- | --------------------- | ---- | ---- |

### Deterministic checks

These checks are the CI bar. The ProductShape commands run in `.github/workflows/ci.yml` as `node packages/cli/dist/bin.js ...` after the build; the listed `pnpm` checks run as shown in the workflows.

| Check | How it runs | Evidence it produces |
| --- | --- | --- |
| Lint | `pnpm lint` | Passing GitHub Actions check |
| Formatting | `pnpm format:check` | Passing GitHub Actions check |
| Type checking | `pnpm typecheck` | Passing GitHub Actions check |
| Build | `pnpm build` | Passing GitHub Actions check |
| Tests | `pnpm test` | Passing GitHub Actions check, including configured platform/Node matrix |
| Lifecycle validation | `pnpm lifecycle:check` | Passing GitHub Actions check |
| Release workflow validation | `pnpm release-workflow:check` | Passing GitHub Actions check |
| Release contract smoke | `pnpm release-contract:smoke` | Passing GitHub Actions check |
| ProductShape model validation | `node packages/cli/dist/bin.js validate` | Passing GitHub Actions check |
| ProductShape change validation | `node packages/cli/dist/bin.js change validate` | Passing GitHub Actions check |
| ProductShape graph | `node packages/cli/dist/bin.js graph` | Passing GitHub Actions check |
| ProductShape doctor | `node packages/cli/dist/bin.js doctor` | Passing GitHub Actions check |
| OpenSpec citation verification | `node packages/cli/dist/bin.js citations verify --provider openspec` | Passing GitHub Actions check |
| Managed integration consistency | `node packages/cli/dist/bin.js integration update --check` | Passing GitHub Actions check |

The changeset reminder is warning-only and is not a blocking check. The workflow's `npm audit signatures || true` is non-blocking. No blocking dependency, secret, or SAST scan was found.

## Lifecycle stages and states

GitHub's `OPEN` or `CLOSED` state remains separate from lifecycle status. Every open issue has exactly one canonical `status:*` label. Issues stay open through refinement, proposal, and implementation, then close only after the linked pull request merges.

| Stage | State on entry | State on exit | Transition | Fired by |
| --- | --- | --- | --- | --- |
| `refine` | `status:backlog` | `status:ready` | Set Ready after the gate passes | `refine` |
| `propose` | `status:ready` | `status:proposed` | Set after the plan passes review | `propose` |
| `implement` | `status:proposed` | `status:in-progress` → `status:in-review` | Set in-progress on entry; set in-review when Done passes and the PR is ready | `implement` |
| `integrate` | `status:in-review` | `status:done`, issue closed | Merge the linked PR; verify GitHub closes it, then set done | `integrate` |
| `review` | `status:done` | `status:done` | Create the per-item retrospective; no lifecycle transition | `review` |

### Transitions no capability ever fires

| Transition                      | Meaning                                | Who fires it |
| ------------------------------- | -------------------------------------- | ------------ |
| close before a linked PR merges | Administrative closure or cancellation | human only   |
| reopen                          | Resume a closed issue                  | human only   |
| deprioritize, block, or reject  | Backlog decision                       | human only   |

## Work item fields

GitHub Issues exposes standard issue fields. Acceptance criteria are a Markdown section in the issue body by project convention; lifecycle status is one canonical label.

| Field | Identifier | Required by | Notes |
| --- | --- | --- | --- |
| Issue identifier | GitHub issue `number` | all stages | Use the exact issue number. |
| Title | `title` | Ready | Outcome-focused. |
| Description and criteria | `body` | Ready | Markdown; preserve unrelated sections when editing. |
| State | `state` | lifecycle stages | Report GitHub's `OPEN` or `CLOSED` verbatim; this is separate from lifecycle status. |
| Lifecycle status | one `status:*` label | every transition | Exactly one on each open issue; replace the old status in the same update. |
| Labels | `labels` | as applicable | Type, area, and priority remain independent metadata. |
| Assignees | `assignees` | as applicable | Standard GitHub issue field. |
| Milestone | `milestone` | as applicable | Standard GitHub issue field. |

## Label conventions

Use the shared lifecycle labels `status:backlog`, `status:ready`, `status:proposed`, `status:in-progress`, `status:in-review`, and `status:done`. Keep classification and planning labels independent. `blocked` and `owner-review` are optional overlays. New issues start at `status:backlog`.

Post-merge retrospectives use one file per issue at `docs/reviews/issue-<number>.md`. The baseline date is 2026-10-19; earlier merges are historical and excluded from review debt. No separate process ledger is used.

## Fast Forward

| Setting | This project requires |
| --- | --- |
| Enabled | Yes when the active harness can attest a distinct reviewer model |
| Executor and reviewer | Resolve at run time; reviewer must be a different model |
| Maximum correction rounds | 3 per gate |
| Substitutable judgement items | None by default; Product Engineer and Repository Maintainer judgement stays human-owned |
| Durable evidence | `docs/delivery/ff/<work-item-id>/<run-id>/run.json` and `summary.md` |
| Human-only or protected gates | Product-scope and accepted-decision changes, human-only Done judgements, required forge approvals, production publication, and repository red lines |

`/ff` may prepare and update a PR, push its branch, and merge only when every configured gate passes and the forge permits it. The public-site publication job is a separate human-authorized deployment gate.

## Work in progress

**WIP cap**: Not used · **Query used at pickup**: Not used · **Sprint commitment**: Not used · **Board**: None found during adoption; there is no configured board limit to record.

## Roles

| Role | Who | Decides |
| --- | --- | --- |
| Repository Maintainer | Human maintainer/reviewer | Acceptance criteria review, implementation completeness, test coverage judgement, relevant security review, architecture/design conformance, documentation completeness, required PR approval, and known limitations. |
| Product Engineer | Human product role | Product/spec consistency when product behaviour changes. |

## Installed roles

The `.agents/skills/` files are the project-owned role sources; `.claude/skills/` contains generated copies. These defaults were reset from Agentic SDLC 0.2.2 on 2026-10-19.

| Role skill             | Adapted from                         | Installed  | Projected to       |
| ---------------------- | ------------------------------------ | ---------- | ------------------ |
| `read-work-item`       | Agentic SDLC GitHub Issues template  | 2026-10-19 | Codex, Claude Code |
| `read-work-item-links` | Agentic SDLC GitHub Issues template  | 2026-10-19 | Codex, Claude Code |
| `create-work-item`     | Agentic SDLC GitHub Issues template  | 2026-10-19 | Codex, Claude Code |
| `update-work-item`     | Agentic SDLC GitHub Issues template  | 2026-10-19 | Codex, Claude Code |
| `transition-work-item` | Agentic SDLC GitHub Issues template  | 2026-10-19 | Codex, Claude Code |
| `comment-work-item`    | Agentic SDLC GitHub Issues template  | 2026-10-19 | Codex, Claude Code |
| `create-branch`        | Agentic SDLC branch template         | 2026-10-19 | Codex, Claude Code |
| `checkout-branch`      | Agentic SDLC branch template         | 2026-10-19 | Codex, Claude Code |
| `open-pull-request`    | Agentic SDLC GitHub template         | 2026-10-19 | Codex, Claude Code |
| `inspect-pull-request` | Agentic SDLC GitHub template         | 2026-10-19 | Codex, Claude Code |
| `update-pull-request`  | Agentic SDLC GitHub template         | 2026-10-19 | Codex, Claude Code |
| `merge-pull-request`   | Agentic SDLC GitHub template         | 2026-10-19 | Codex, Claude Code |
| `inspect-ci-result`    | Agentic SDLC GitHub Actions template | 2026-10-19 | Codex, Claude Code |

## Provided roles

OpenSpec is installed and its skill names were resolved from `.claude/skills/` during adoption. These skills provide the plan-artifact contracts; do not install duplicate skills for them.

| Contract         | Provided by | Skill to invoke           |
| ---------------- | ----------- | ------------------------- |
| `propose-change` | OpenSpec    | `openspec-propose`        |
| `apply-change`   | OpenSpec    | `openspec-apply-change`   |
| `sync-specs`     | OpenSpec    | `openspec-sync-specs`     |
| `archive-change` | OpenSpec    | `openspec-archive-change` |

### Capability gaps

These dependencies are referenced by the installed lifecycle stage skills but are not supplied as project-owned skills/agents by this adoption. APM installed skill bundles, not the separate auditor agent. The stage must report the gap when it reaches one rather than claiming the capability ran.

| Missing capability | Used by | Status |
| --- | --- | --- |
| Independent Done-gate reviewer | `implement`, `integrate`, `ff` | Resolve a distinct model through the active harness; stop if independent review cannot be attested. |
| `read-work-item-attachments` role | `refine` | No project-owned role capability installed; attachments must be reported as unavailable unless read through another supported tool. |
| `discover-related-docs`, `read-kb-page`, `classify-doc-drift`, `sync-doc-to-kb` roles | `refine`, `propose`, `integrate` | No project-owned KB/documentation bridge roles installed; use repository docs directly and report unavailable external KB actions. |
| `read-work-item-attachments` role | `refine` | No project-owned attachment role installed; report attachments unavailable unless the active harness can read them. |

## Amendment log

| Date | Section | Change | Why |
| --- | --- | --- | --- |
| 2026-10-18 | Bootstrap | Adopted Ready, Done, lifecycle mapping, roles, and CI expectations. | Initial adoption against ProductShape issue, workflow, model, and OpenSpec evidence. |
| 2026-10-19 | Lifecycle defaults | Adopted canonical `status:*` labels, per-item retrospective baseline, and bounded Fast Forward. | Align issue handling, review history, and PR integration across repositories. |
