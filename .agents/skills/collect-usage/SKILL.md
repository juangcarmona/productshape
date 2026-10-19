---
name: collect-usage
description: "Summarise human-versus-agent effort for one work item from captured agent telemetry: active time, cost and tokens, reporting gaps honestly. Read-only. Use when a review needs measured figures, not a guess."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

One responsibility: turn captured telemetry into a compact effort summary for one work item (**human active time, agent active time, cost, tokens**), and say plainly where the figures came from and what is missing.

Input is a work item identifier. Output is the summary plus every gap behind it.

**Read-only.** This skill never writes a file, never starts a collector, and never touches the review log. The caller passes the figures on.

## When to use

- When `review` needs measured effort figures for a merged work item.
- Before `review-entry` records an effort line, so the line carries measurements rather than estimates.
- When a report must state honestly that a project captures no agent telemetry.

## When not to use

- Writing the review entry. That is `review-entry`, which takes these figures as input.
- Setting up or configuring telemetry capture. That belongs to the project's own metrics setup, established by `adopt`.
- Deciding what the figures mean for how the team works. That is `review`.

## Workflow

1. **Locate the telemetry.** Read the project's own metrics documentation for where captured data lives and how sessions are mapped to work items. No such configuration means report *effort unavailable: this project captures no agent telemetry* and stop. That is a complete, correct answer. *Done when:* the data files and the mapping are known, or their absence is established.
2. **Resolve the item's sessions** through the project's session-to-item mapping. Prefer a shared, tolerant reader where the project provides one: a malformed record is repaired or skipped and **reported as skipped**, never silently dropped and never fatal. *Done when:* the set of session identifiers is in hand, possibly empty. Empty is a result, not an error.
3. **Join on the session identifier, and only on it.** Do not attribute effort by process-level or resource-level attributes: they are read once at process start and are unreliable across hosts and clients. A join on the wrong key produces confident, wrong numbers. *Done when:* only datapoints carrying a resolved session identifier are included.
4. **Aggregate** cost, tokens by type, agent active time and human active time. State how human time was derived: if it is an estimate from idle-capped turn gaps rather than a directly recorded figure, say so and give the cap. Where two sources overlap (a shared summary and a local join), report their **union** and say so, because one may hold other people's sessions and the other only this machine's. *Done when:* every figure has a value or is marked unavailable.
5. **Report, gaps included.** The item, the sessions covered, the window, and every figure with its source. Relay every gap verbatim: missing telemetry, a cross-check mismatch, a repaired or skipped mapping line, a session mapped but carrying no usage records. *Done when:* the caller has the figures and knows exactly what they do not cover.

## Validation

- Nothing was written: no file, no collector started, no review log touched.
- Every figure carries a source, or is marked `unavailable`.
- The join used the session identifier alone.
- A mapped session with no usage records is reported as lost, not as zero.
- Every repaired or skipped mapping line reached the report.
- No gap note appears when there were no gaps.
- No personal identity beyond what the review entry needs.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Reporting `0` for a figure with no source signal | `unavailable` is the honest value. `0` is a measurement |
| Treating a mapped session with no usage records as zero effort | It is lost data, and the difference matters |
| Rounding an absent figure up to a plausible one | Every summary built on these numbers inherits the lie, and nobody can tell afterwards which figures were measured |
| Attaching a gap note to every run | An honesty signal that fires every time stops being read |
| Attributing effort by process-level or resource-level attributes | Join on the session identifier only. The wrong key yields confident, wrong numbers |
| Reading an in-memory dashboard as the source of truth | It loses data on restart. Read the captured files |
| Re-deriving a join the project already implements in a script | Report that script's output, so a shared summary and a local run can never disagree |
| Writing the review entry from here | Separate responsibility. `review-entry` takes these figures as input |
| Letting a malformed record abort the run | Repair or skip it, and report it as skipped |
