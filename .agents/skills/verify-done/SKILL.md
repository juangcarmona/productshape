---
name: verify-done
description: "Assess a change against the project's Definition of Done: drive the deterministic lane, collect its evidence, and route judgement items to their owning roles. Use when a change reaches the Done gate."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

One responsibility: produce a verdict on whether a change satisfies **this project's** Definition of Done, item by item, with each item's evidence or its owner attached.

The Done gate asks whether the resulting change is sufficiently verified. It has two lanes, and this skill drives both but settles only one of them.

## When to use

- At the Done gate, before a pull request is marked ready for review.
- When deciding whether a change may proceed to integration.
- In report-only mode, when `status` needs the gate's detail without acting on it.

## When not to use

- Re-deriving and running the pipeline's checks. That is `verify-like-ci`, which this skill calls.
- Acting on the verdict: merging, transitioning, commenting or marking a pull request ready. This skill produces the verdict; the caller acts.

## Workflow

### Load the definition first

Read `docs/engineering-lifecycle.md`, section `## Definition of Done`, including its *Additional to this project* and *Deterministic checks* tables. Each item carries a **lane** (`deterministic`, `judgement` or `both`) and, where it is judgement, an **owning role** resolved through the `## Roles` section.

If the file is absent, stop and report that this repository has no lifecycle configuration and that `adopt` should run first. Never substitute a generic checklist: a Definition of Done nobody agreed to is not one.

*Done when:* every item, its lane, and every judgement item's role are in hand.

### The deterministic lane

Items an agent or CI settles mechanically, producing **evidence**.

1. **Run the checks the pipeline runs**, via `verify-like-ci`, which derives them from the pipeline definitions rather than from the configuration. The *Deterministic checks* table records what the team **expects** to exist, so compare the two and report a check the team expects that the pipeline no longer runs. A silently disappeared gate is a finding. *Done when:* every check has a terminal exit code and the two lists agree, or the difference is reported.
2. **Capture runtime evidence** where the definition's evidence dimension asks for it, via `verify-runtime`. *Done when:* the artifacts exist and their paths are recorded.
3. **Map results onto items.** Each deterministic item is `satisfied` with its evidence, `failed` with what failed, or `unprovable` with the reason. *Done when:* no deterministic item lacks one of those three.

**`unprovable` is never `satisfied`.** A check that could not run on this machine leaves its item unmet and says so by name.

### The judgement lane

Items a named human role decides, producing a **decision**.

1. **Assemble the case for each judgement item**: what the item asks, the evidence bearing on it, and what the deterministic lane could and could not answer. A reviewer should not have to reconstruct the change to decide. *Done when:* each judgement item has its case written.
2. **Route each item to its owning role**, named from the configuration. Where one role owns several items, present them together. *Done when:* every judgement item names who must decide it.
3. **Record decisions as they arrive**: satisfied, not satisfied with what is missing, or waived with a reason and by whom. *Done when:* no judgement item is silently absent from the report.

**Never mark a judgement item satisfied on your own.** Not on the strength of evidence that looks convincing, not because the deterministic lane was green, not because it seems obviously fine. An item is in that lane precisely because someone decided a person must look.

### The verdict

1. **Report the full table** (item, lane, status, evidence or owner) followed by a single verdict. **Done** means every applicable item satisfied, with `N/A` items listed alongside their reasons so the verdict is auditable. **Not done** names every unmet item, each with what specifically is missing and who or what would close it. *Done when:* the caller can act without re-deriving anything.

A not-done verdict blocks integration, because `integrate` refuses a change whose Done gate has not passed. It is not a judgement about the work or the person: it is a list of what remains.

## Validation

- Both lanes ran. A green deterministic lane is half the gate, not the gate.
- Every item came from the project's configuration; none was added or skipped.
- Every deterministic item is `satisfied`, `failed` or `unprovable`, never blank.
- Evidence is linked, not asserted.
- No judgement item was marked satisfied without its named role deciding.
- An item with no lane, or a judgement item whose role does not resolve, is reported as a configuration defect rather than guessed.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Reporting the gate passed because CI is green | The judgement lane is the other half |
| Treating `unprovable` as `satisfied` | It leaves the item unmet, by name |
| Deciding a judgement item because the evidence looks convincing | The named role decides. That is why the lane exists |
| Adding an item the team never adopted | The configuration is the only rubric |
| Asserting "tests pass" with no run behind it | Evidence is linked, not asserted |
| Guessing the lane of an item that has none | Report it as a configuration defect |
| Softening the verdict to unblock a change | Widening the gate is not passing it |
| Re-deriving the pipeline checks here | That is `verify-like-ci`'s single responsibility |
