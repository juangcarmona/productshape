---
name: adopt
description: "Bootstrap, reconcile, or explicitly reset a project's lifecycle configuration to the shared defaults. Use when onboarding, when repository tooling changes, or when the user requests `adopt defaults`."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Establish and keep current this project's lifecycle configuration, `docs/engineering-lifecycle.md`, and the role capabilities that go with it. Discover how the team already works and write that down; never impose a tracker, a forge, a CI system or a methodology.

Run in one of three modes. **Bootstrap** when no configuration exists, **reconcile** when it does, or **defaults** when the user explicitly invokes `adopt defaults`. Reconcile preserves established project choices. Defaults replaces the previous Agentic SDLC configuration and installed role adaptations with the shared defaults, while carrying forward facts that still describe the repository.

The configuration belongs to the project once bootstrap has run. The templates in `assets/role-skills/` are starting points, not authoritative copies, so reconcile works against what the project has made of them and preserves customisation by default.

## When to use

- Onboarding a repository onto the development lifecycle for the first time.
- The tracker, forge, CI system or test tooling changed.
- The team's roles, policies or engineering process changed.
- A lifecycle capability stopped and reported that no configuration exists.
- Periodically, to find Definition of Done items that can move from the judgement lane to the deterministic lane.
- Resetting prior Agentic SDLC lifecycle choices and installing the shared defaults with `adopt defaults`.

## When not to use

- Running a work item through the loop. Use `refine`, `propose`, `implement`, `integrate` or `review`.
- Asking where an item stands. Use `status`.
- Amending the configuration from delivery evidence after a cycle closes. That is `review`, which proposes the amendment; this capability is for changes driven by the toolchain or the process rather than by one cycle's lesson.

## Workflow

Bootstrap and reconcile show each proposed write and wait for confirmation. The explicit `adopt defaults` invocation authorizes the bounded reset described below without a second confirmation. Adoption never merges a pull request or deploys software.

Adoption is idempotent: applying the shared standard to an already-conforming repository produces no changes. Reconcile existing names, descriptions, workflows, and repository-specific conventions before proposing edits. Preserve existing labels and their meaning; never rename, delete, recolor, or repurpose a label with existing usage. Add only missing shared labels, and report conflicts where a name already means something else. Optional labels are installed only when the repository's workflow uses them.

### 1. Detect the mode

Read the invocation and `docs/engineering-lifecycle.md`. An explicit `defaults` argument means **defaults**; otherwise absent configuration means **bootstrap** and present configuration means **reconcile**. State which mode is running before doing anything else.

*Done when:* the mode is named out loud.

If the mode is **defaults**, complete the reset workflow below and then report. Bootstrap and reconcile continue through the remaining numbered workflow.

### Defaults mode: replace the previous adoption

Run this branch only for the explicit `adopt defaults` invocation. The invocation is the user's authorization to reset the listed lifecycle artifacts.

1. Run the repository discovery in step 2 without asking for lifecycle preferences; use the shared defaults for those choices.
2. Read the existing **Installed roles** table and inventory `docs/engineering-lifecycle.md`, every listed source under `.agents/skills/`, the corresponding generated harness copies, and any local lifecycle command wrappers recorded by the old configuration. If no lifecycle file exists, the prior owned-file list is empty.
3. Replace `docs/engineering-lifecycle.md` with the current package template, populated from repository files and live tooling. Carry forward verified product-specific Ready/Done requirements, CI checks, role identities, issue fields, and spec-tool mappings. Replace prior label, review-record, transition, and Fast Forward conventions with the shared defaults below.
4. Replace the listed Agentic SDLC role sources with freshly adapted package defaults, then regenerate only their recorded harness copies. Remove a listed role only when the new defaults no longer require it. Do not remove a file that is absent from the prior Installed roles table.
5. Make the installed package skills the single Agentic SDLC stage implementation. In Claude Code, ensure the repository registers and enables the `agentic-sdlc` marketplace plugin. Remove duplicate local stage commands or copied stage skills for `adopt`, `refine`, `plan`, `propose`, `implement`, `integrate`, `review`, `status`, and `ff` only when the prior lifecycle configuration identifies them as Agentic SDLC copies. This includes legacy `.claude/commands/ff.md` and `fast-feedback-loop` wrappers. Preserve unrelated user commands and skills. In Claude Code invoke package capabilities as `/agentic-sdlc:<capability>`; in portable skill hosts invoke them by name.
6. Set the retrospective baseline date to today. Preserve prior retrospective files, log entries, PR comments, and process ledgers as historical records; do not bulk-convert or delete them. `status` reports review debt only for merges on or after this baseline.
7. For GitHub, add any missing canonical `status:*` labels. Map recognized legacy labels using [`references/github-label-standard.md`](references/github-label-standard.md). For issues with no state label, inspect linked PR state and branch evidence: plan-only drafts are `proposed`, implementation drafts are `in-progress`, ready PRs are `in-review`, active implementation branches are `in-progress`, and issues with no evidence of active work are `backlog`. Reread each issue immediately before the update, preserve every unrelated label, and verify the result. Leave ambiguous issues, issues with conflicting state labels, and all closed issues unchanged; report them. Never delete a GitHub label.
8. Preserve all files outside the lifecycle configuration and the previously listed role sources/copies. In particular, keep `AGENTS.md`, issue and PR forms, product and architecture sources, ADRs, process ledgers, and unrelated harness skills.

The shared defaults are: one `status:*` label per open work item; a per-item retrospective at `docs/reviews/issue-<number>.md` for merges on or after the adoption baseline; a separate existing process ledger only for cross-item improvements; and enabled `/ff` using the existing stage capabilities, a distinct runtime-selected reviewer model, three correction rounds, and run evidence under `docs/delivery/ff/<work-item-id>/<run-id>/`. `/ff` may create/update a PR, push its branch, and merge only after every configured gate passes and the forge permits it. Human-only decisions, required human approvals, deployment, and repository red lines still stop the run.

If live tooling cannot resolve a field, preserve the package default where one is defined; otherwise record `unresolved` and report the exact next action. Never invent a project fact to make the reset appear complete.

*Done when:* the prior listed adoption artifacts have been replaced by the shared defaults, recognized open issues have exactly one canonical lifecycle status, and every ambiguous or unavailable item is reported.

### 2. Discover before asking, in both modes

Resolve everything the repository and its tooling can answer, and bring findings as confirmations rather than blank questions:

- the tracker, the forge, the CI system;
- the test frameworks, analyzers, formatters and scanners the pipeline already runs, which is most of the deterministic half of the Definition of Done and is discoverable from the pipeline configuration itself;
- whether a specification tool is present;
- the harness directories already in the repository (`.agents/skills/`, `.claude/skills/`);
- any role capabilities a previous run installed.
- the existing issue and pull request templates, label names, descriptions, colors, and usage; do not assume a tracker feature is configured just because the forge supports it;
- process-ledger location and history, including prior conflict resolutions and any existing lint or append-only convention.

*Done when:* every discoverable fact is in hand and the human has seen the list.

### 3. Bootstrap: derive the Definition of Ready

Walk [`assets/definition-of-ready.md`](assets/definition-of-ready.md) with the team: one concrete question per dimension, about their actual work items, with the reference on the table. Never ask "do you have a Definition of Ready?"; that question produces a shrug.

Each answer produces **keep**, **adapt**, or **drop with a recorded reason**. Then the question no reference can answer:

> What else must be true before your team is comfortable saying: *this item is ready to be planned*?

*Done when:* every dimension has a disposition and the team's own additions are captured.

### 4. Bootstrap: derive the Definition of Done

Walk [`assets/definition-of-done.md`](assets/definition-of-done.md) the same way, leading with what step 2 found in CI. For every dimension the team keeps, settle two further things: its **lane**, deterministic, judgement or both, and for judgement items the **role** that decides.

Push against both failure modes. Everything in the judgement lane means the loop automates nothing and the definition is theatre. Everything in the deterministic lane means nobody ever looks at the change, and human review is not satisfiable mechanically.

Then the closing question again, for what the reference does not cover.

*Done when:* every dimension has a disposition, a lane, and where it needs one a named role.

### 5. Bootstrap: map the lifecycle onto the project's states

The stage-to-state mapping, the transitions each stage fires, the fields each transition's screen requires, whether the team caps work in progress, whether they commit to sprints.

For GitHub, use [`references/github-label-standard.md`](references/github-label-standard.md) as a shared vocabulary, not as a mandate to create every label. Mark each listed label **shared** or **optional**, verify existing use and map each stage to the repository's current workflow. For other trackers or forges, map the same lifecycle semantics to their native concepts without requiring GitHub labels.

**Every identifier is resolved from live tooling in this session.** A transition id transcribed from a diagram or from memory breaks the loop a month later, and the failure will look like something else entirely.

*Done when:* every value in the mapping was verified against the real system.

### 6. Reconcile: inspect what exists and name the drift

Read the configuration, its Definition of Ready and Definition of Done, the installed role capabilities listed under **Installed roles**, and the project's own customisations. Then report three things, separately:

- **Missing capabilities**: roles the team's current practice needs that are not installed.
- **Stale assumptions**: values that no longer resolve against live tooling, such as a moved tracker, a transition id that has gone, a check that disappeared from the pipeline, or a role nobody fills.
- **Improvements**: the most valuable being Definition of Done items that can move from the judgement lane to the deterministic lane, now that tooling exists which did not before.
- **Lifecycle-standard drift**: missing shared labels or conventions, optional labels that are not used, and any repository-specific choice that should be retained. Existing usage takes precedence over cosmetic standardization.

Report what is drifting even when nothing needs changing. A clean reconcile is a useful result.

*Done when:* the three lists exist, each item resolved against live tooling rather than assumed.

### 7. Reconcile: propose every change as a diff

Nothing in an established configuration changes without a shown diff and an explicit human confirmation, section by section and capability by capability.

- Preserve project customisation. Where a template has moved on and the project has adapted its copy, show both and let the human choose; never regenerate over the adaptation.
- A role capability a previous run installed that the project no longer needs is **reported, not deleted**.
- Decline is a valid answer and is recorded in the amendment log with its reason.
- For labels in bootstrap or reconcile, show the exact missing labels and metadata before creating them. Keep optional labels opt-in, and leave conflicting or already-used labels untouched until the project owner resolves their semantics. Defaults mode uses the canonical lifecycle migration described above and never deletes forge labels.
- For issue and pull request conventions, propose additive template or documentation changes only when the current convention has a demonstrated gap. Do not replace project-specific wording or fields merely to match the reference.

*Done when:* every proposed change was confirmed or declined, and nothing was written that was not confirmed.

### 8. Install or update the role capabilities

For each required role (`read-work-item`, `transition-work-item`, `open-pull-request`, `inspect-ci-result`, `merge-pull-request`) and each further role the team's practice calls for:

1. Take the template from [`assets/role-skills/`](assets/role-skills).
2. Pick the reference matching this project's tooling.
3. Adapt it, replacing every placeholder with a verified value.
4. Write it to `.agents/skills/<role>/SKILL.md`, renamed from `SKILL.template.md`. That file is the source the project owns.

Installed role skills must honor the explicit Fast Forward authorization recorded in `## Fast Forward`: routine writes may proceed without per-write confirmation only when called by an enabled `/ff` run. They still refuse any human-only transition, protected merge, production action, or other repository red line.

Where no reference matches, author against the contract following [`references/adapting-role-templates.md`](references/adapting-role-templates.md) and **record that it was authored, not adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

**Install only what is needed.** A team without sprints gets no sprint role and no mention of one. Agile does not imply Scrum.

Where a specification tool is present and generates its own skills under the same names, run its initialiser and do not install the plan-artifact templates: a vendored copy would drift from what the tool produces and collide with it. Instead, record in **Provided roles** which generated skill satisfies each plan-artifact contract (`propose-change`, `apply-change`, `sync-specs`, `archive-change`), with the name resolved from live tooling in this session. The lifecycle stages dispatch on that record; without it they call a role that was never installed.

*Done when:* every installed role has a verified implementation, every uninstalled role has a reason, and every role provided by a specification tool is recorded with its live-resolved name.

### 9. Make the capabilities reachable from every harness the team runs

`.agents/skills/` is read natively by GitHub Copilot. Claude Code reads `.claude/skills/`. Copy each adapted `SKILL.md` into the directories the team's harnesses actually read, and say plainly which files are copies and that `.agents/skills/` remains the file to edit.

Whether the copies are committed is the project's decision and follows how it already treats generated files. Record the decision in the configuration; do not impose one.

*Done when:* every installed role is reachable from every harness the team runs, and the team knows which files are source and which are copies.

### 10. Configure Fast Forward when requested

Fast Forward is opt-in. Ask whether the project wants unattended execution; default to **disabled**. If enabled, resolve the executor and independent review model through the project's actual harness, confirm they differ, choose a bounded correction limit, and identify durable evidence storage. Record which judgement gates an independent agent may decide and which still require a human or forge-protected approval. Never configure a model name from memory or claim independence when the harness cannot attest it.

*Done when:* the project has either recorded Fast Forward as disabled or supplied every required setting and stop condition.

### 11. Write the configuration

Fill [`assets/engineering-lifecycle.md`](assets/engineering-lifecycle.md) and write it to `docs/engineering-lifecycle.md`. In bootstrap and reconcile modes, show it and confirm before writing; in defaults mode, the explicit invocation authorizes the bounded replacement. In reconcile mode, write only the confirmed sections and append to the amendment log.

Its section headings are a **contract**: every lifecycle capability locates what it needs by heading. Headings are never renamed or removed, even when a section is empty. The full contract, including which capability reads which section, is in [`references/configuration-contract.md`](references/configuration-contract.md).

This file is the adopted lifecycle contract. It is not `CLAUDE.md`, `AGENTS.md` or a Copilot instructions file. Those are harness context files; one may point at the configuration but never replaces it.

### 12. Report

What was installed or changed, what was detected and declined and why, what needs doing by hand such as a board's own column limits which no tooling reaches, which files are copies, and what to run next. Name the next capability; do not run it.

*Done when:* the human knows the state of their configuration and what follows.

## Validation

- The mode was detected from the repository and stated, not guessed or asked for.
- Every value written was resolved from live tooling in this session.
- Every bootstrap and reconcile file write was shown and confirmed; defaults mode replaced only the inventoried lifecycle configuration and role files it owned.
- In reconcile mode, no established configuration or adapted capability was overwritten without a shown diff and a confirmation. Defaults mode replaced the prior configuration and role adaptations listed by its Installed roles table.
- `docs/engineering-lifecycle.md` carries every contract heading, including the empty ones.
- Every installed role capability resolves from every harness directory the team runs.
- The **Installed roles** table lists what exists, with what each was adapted from.
- Bootstrap and reconcile fired no tracker transition. Defaults mode changed only recognized lifecycle labels on open issues and left ambiguous and closed issues unchanged. No knowledge base was touched.
- A second adoption pass with no repository drift proposes no duplicate labels, repeated template edits, or configuration churn.
- Existing label names, semantics, and usage were preserved; every optional label has a repository-specific reason to exist.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Asking "do you have a Definition of Done?" | Walk the reference one dimension at a time, against their real work items |
| Imposing the reference as a standard to comply with | It is material to walk. Dropping a dimension with a recorded reason is a valid outcome |
| Writing a value that was not verified this session | Resolve it from live tooling or leave the placeholder and say so |
| Regenerating an adapted capability from its template | Show both versions and let the human choose. Customisation is the project's, not the plugin's |
| Deleting a role the project stopped needing | Report it. Deletion is the project's call |
| Putting everything in the judgement lane | The loop then automates nothing. Push for what CI already settles |
| Putting human review in the deterministic lane | It is not satisfiable mechanically |
| Installing every role capability because they exist | Every unnecessary skill is permanent context cost and one more thing to keep true |
| Writing an adapted capability only into a harness directory | `.agents/skills/` is the source. A copy with no source behind it is lost the next time anything is regenerated |
| Running the next stage after reporting | Adoption ends by naming what follows |
